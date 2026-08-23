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

    let cleaned = text;

    // PRIMERO: Extraer solo la parte antes de | (el título real)
    if (cleaned.includes('|')) {
        cleaned = cleaned.split('|')[0];
    }

    // Remover contenido entre paréntesis/corchetes
    cleaned = cleaned.replace(/\s*[\[(].*?[\])]/g, '');

    // Si tiene formato "ARTISTA - TÍTULO", extraer solo el título
    const dashMatch = cleaned.match(/^.+?\s*[-–—]\s*(.+)$/);
    if (dashMatch) {
        cleaned = dashMatch[1];
    }

    // Remover "- Topic" de canales de YouTube
    cleaned = cleaned.replace(/\s*-\s*topic$/i, '');

    // Remover indicadores de video oficial
    cleaned = cleaned.replace(/\b(official|video|audio|lyric|lyrics|hd|hq|4k|music video|visualizer)\b/gi, '');

    // Remover caracteres especiales excepto espacios y letras acentuadas
    cleaned = cleaned.replace(/[^\w\s\u00C0-\u024F]/g, ' ');

    // Normalizar espacios
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Busca metadata de una canción en MusicBrainz
 * @param {string} artist - Nombre del artista
 * @param {string} title - Título de la canción
 * @returns {Promise<{title: string, artist: string, album: string|null, mbid: string}|null>}
 */
async function searchMusicBrainz(artist, title) {
    try {
        console.log('[MusicBrainz] ========== BÚSQUEDA ==========');
        console.log('[MusicBrainz] Input artista:', artist);
        console.log('[MusicBrainz] Input título:', title);

        // Limpiar los términos de búsqueda
        const cleanArtist = cleanForSearch(artist);
        const cleanTitle = cleanForSearch(title);

        console.log('[MusicBrainz] Limpio artista:', cleanArtist);
        console.log('[MusicBrainz] Limpio título:', cleanTitle);

        if (!cleanArtist && !cleanTitle) {
            console.log('[MusicBrainz] ❌ No hay datos para buscar');
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

        // Construir query de búsqueda - probar búsqueda más flexible
        let query = '';
        if (cleanTitle && cleanArtist) {
            // Búsqueda combinada
            query = `"${cleanTitle}" AND artist:"${cleanArtist}"`;
        } else if (cleanTitle) {
            query = `"${cleanTitle}"`;
        } else {
            query = `artist:"${cleanArtist}"`;
        }

        console.log('[MusicBrainz] Query:', query);

        const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            },
            params: {
                query: query,
                fmt: 'json',
                limit: 10
            },
            timeout: 10000
        });

        console.log('[MusicBrainz] Respuesta status:', response.status);
        console.log('[MusicBrainz] Resultados encontrados:', response.data.recordings?.length || 0);

        if (!response.data.recordings || response.data.recordings.length === 0) {
            console.log('[MusicBrainz] ❌ No se encontraron resultados');
            cache.set(cacheKey, { data: null, timestamp: Date.now() });
            return null;
        }

        // Mostrar primeros resultados
        console.log('[MusicBrainz] Primeros resultados:');
        response.data.recordings.slice(0, 5).forEach((rec, i) => {
            const recArtist = rec['artist-credit']?.[0]?.name || 'Unknown';
            console.log(`[MusicBrainz]   ${i + 1}. "${rec.title}" - ${recArtist} (score: ${rec.score})`);
        });

        // Obtener el mejor resultado
        const recording = response.data.recordings[0];

        const metadata = {
            title: recording.title,
            artist: recording['artist-credit']?.[0]?.name || recording['artist-credit']?.[0]?.artist?.name || artist,
            album: recording.releases?.[0]?.title || null,
            mbid: recording.id,
            score: recording.score || 0
        };

        console.log('[MusicBrainz] ✅ Seleccionado:', metadata.title, 'por', metadata.artist, `(score: ${metadata.score})`);
        console.log('[MusicBrainz] ================================');

        // Guardar en cache
        cache.set(cacheKey, { data: metadata, timestamp: Date.now() });

        return metadata;

    } catch (error) {
        if (error.response?.status === 503) {
            console.log('[MusicBrainz] ⚠️ Rate limit alcanzado, esperando...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.error('[MusicBrainz] ❌ Error:', error.message);
            if (error.response) {
                console.error('[MusicBrainz] Response status:', error.response.status);
                console.error('[MusicBrainz] Response data:', error.response.data);
            }
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
