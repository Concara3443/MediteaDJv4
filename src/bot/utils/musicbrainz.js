const axios = require('axios');

// User-Agent requerido por MusicBrainz
const USER_AGENT = 'MediteaDJ/1.0.0 (https://guillermocort.es/mediteadj)';

// Cache simple para evitar llamadas repetidas
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

// Rate limiting: MusicBrainz permite 1 request por segundo
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 segundos entre requests

/**
 * Espera el tiempo necesario para respetar el rate limit
 */
async function waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();
}

/**
 * Limpia el texto para búsqueda
 * @param {string} text - Texto a limpiar
 * @returns {string} Texto limpio
 */
function cleanForSearch(text) {
    if (!text) return '';

    return text
        // Remover contenido entre paréntesis/corchetes
        .replace(/\s*[\[(].*?[\])]/g, '')
        // Remover "- Topic" de canales de YouTube
        .replace(/\s*-\s*topic$/i, '')
        // Remover indicadores de video oficial
        .replace(/\b(official|video|audio|lyric|lyrics|hd|hq|4k|music video)\b/gi, '')
        // // Remover "ft.", "feat.", "featuring"
        // .replace(/\s*(ft\.?|feat\.?|featuring)\s+.*/i, '')
        // Remover caracteres especiales excepto espacios y letras acentuadas
        .replace(/[^\w\s\u00C0-\u024F]/g, ' ')
        // Normalizar espacios
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Busca metadata de una canción en MusicBrainz
 * @param {string} artist - Nombre del artista
 * @param {string} title - Título de la canción
 * @returns {Promise<{title: string, artist: string, album: string|null, mbid: string}|null>}
 */
async function searchMusicBrainz(artist, title) {
    try {
        // Limpiar los términos de búsqueda
        const cleanArtist = cleanForSearch(artist);
        const cleanTitle = cleanForSearch(title);

        if (!cleanArtist && !cleanTitle) {
            return null;
        }

        // Verificar cache
        const cacheKey = `${cleanArtist}|${cleanTitle}`.toLowerCase();
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('[MusicBrainz] Cache hit:', cacheKey);
            return cached.data;
        }

        await waitForRateLimit();

        // Construir query de búsqueda
        let query = '';
        if (cleanTitle) {
            query += `recording:"${cleanTitle}"`;
        }
        if (cleanArtist) {
            query += ` AND artist:"${cleanArtist}"`;
        }

        console.log('[MusicBrainz] Buscando:', query);

        const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            },
            params: {
                query: query,
                fmt: 'json',
                limit: 5
            },
            timeout: 5000
        });

        if (!response.data.recordings || response.data.recordings.length === 0) {
            console.log('[MusicBrainz] No se encontraron resultados');
            cache.set(cacheKey, { data: null, timestamp: Date.now() });
            return null;
        }

        // Obtener el mejor resultado
        const recording = response.data.recordings[0];

        const metadata = {
            title: recording.title,
            artist: recording['artist-credit']?.[0]?.name || recording['artist-credit']?.[0]?.artist?.name || artist,
            album: recording.releases?.[0]?.title || null,
            mbid: recording.id,
            score: recording.score || 0
        };

        console.log('[MusicBrainz] Encontrado:', metadata.title, 'por', metadata.artist, `(score: ${metadata.score})`);

        // Guardar en cache
        cache.set(cacheKey, { data: metadata, timestamp: Date.now() });

        return metadata;

    } catch (error) {
        if (error.response?.status === 503) {
            console.log('[MusicBrainz] Rate limit alcanzado, esperando...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.error('[MusicBrainz] Error:', error.message);
        }
        return null;
    }
}

/**
 * Obtiene metadata combinando MusicBrainz y Spotify
 * Intenta MusicBrainz primero (más preciso), luego Spotify como fallback
 * @param {string} artist - Nombre del artista
 * @param {string} title - Título de la canción
 * @param {Function} spotifySearch - Función de búsqueda de Spotify (opcional)
 * @returns {Promise<{title: string, artist: string, source: string}|null>}
 */
async function getMetadata(artist, title, spotifySearch = null) {
    // Intentar MusicBrainz primero
    const mbResult = await searchMusicBrainz(artist, title);

    if (mbResult && mbResult.score >= 80) {
        return {
            title: mbResult.title,
            artist: mbResult.artist,
            album: mbResult.album,
            source: 'musicbrainz',
            hasMetadata: true
        };
    }

    // Si MusicBrainz no encontró resultado confiable, intentar Spotify
    if (spotifySearch) {
        try {
            const spotifyResult = await spotifySearch(artist, title);
            if (spotifyResult) {
                return {
                    title: spotifyResult.title,
                    artist: spotifyResult.artist,
                    album: spotifyResult.album,
                    source: 'spotify',
                    hasMetadata: true
                };
            }
        } catch (error) {
            console.error('[Metadata] Error en Spotify fallback:', error.message);
        }
    }

    // Si MusicBrainz encontró algo pero con score bajo, usarlo como último recurso
    if (mbResult) {
        return {
            title: mbResult.title,
            artist: mbResult.artist,
            album: mbResult.album,
            source: 'musicbrainz-lowscore',
            hasMetadata: true
        };
    }

    return null;
}

module.exports = {
    searchMusicBrainz,
    getMetadata,
    cleanForSearch
};
