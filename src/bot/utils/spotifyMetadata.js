const axios = require('axios');

// Cache para el token de Spotify (válido por 1 hora)
let spotifyToken = null;
let tokenExpiry = 0;

/**
 * Obtiene un token de acceso de Spotify usando Client Credentials
 * @returns {Promise<string>} Access token
 */
async function getSpotifyToken() {
    // Si el token todavía es válido, devolverlo
    if (spotifyToken && Date.now() < tokenExpiry) {
        return spotifyToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET no están configurados en .env');
    }

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
                }
            }
        );

        spotifyToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Renovar 1 min antes

        console.log('[Spotify] ✅ Token obtenido exitosamente');
        return spotifyToken;
    } catch (error) {
        console.error('[Spotify] ❌ Error al obtener token:', error.message);
        throw error;
    }
}

/**
 * Busca una canción en Spotify y devuelve metadata limpia
 * @param {string} artist - Nombre del artista
 * @param {string} title - Título de la canción
 * @returns {Promise<{title: string, artist: string, album: string|null, spotifyId: string}|null>}
 */
async function searchSpotifyTrack(artist, title) {
    try {
        const token = await getSpotifyToken();

        // Pasar título completo + artista a Spotify (Spotify es inteligente para buscar)
        const query = `${artist} ${title}`;

        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                q: query,
                type: 'track',
                limit: 5
            }
        });

        if (!response.data.tracks || response.data.tracks.items.length === 0) {
            console.log('[Spotify] ❌ No se encontraron resultados');
            return null;
        }

        // Obtener el primer resultado (más relevante)
        const track = response.data.tracks.items[0];

        const metadata = {
            title: track.name,
            artist: track.artists[0].name,
            album: track.album ? track.album.name : null,
            spotifyId: track.id
        };

        return metadata;
    } catch (error) {
        console.error('[Spotify] ❌ Error al buscar:', error.message);
        return null;
    }
}

/**
 * Limpia el query de búsqueda removiendo caracteres especiales y texto extra
 * @param {string} text - Texto a limpiar
 * @param {string} artist - Nombre del artista para removerlo del título
 * @returns {string} Texto limpio
 */
function cleanSearchQuery(text, artist = '') {
    let cleaned = text;

    // Remover texto entre corchetes/paréntesis
    cleaned = cleaned.replace(/\s*[\[(].*?[\])]/g, '');

    // Remover separadores como " | " y todo después
    cleaned = cleaned.split('|')[0];

    // Remover el nombre del artista del inicio (case-insensitive)
    if (artist) {
        const artistPattern = new RegExp(`^${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:]*\\s*`, 'i');
        cleaned = cleaned.replace(artistPattern, '');
    }

    // Remover guiones o dos puntos solos al inicio
    cleaned = cleaned.replace(/^[-:]\s*/, '');

    // Remover caracteres especiales excepto espacios
    cleaned = cleaned.replace(/[^\w\s\u00C0-\u024F]/g, ' ');

    // Limpiar espacios múltiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

module.exports = { searchSpotifyTrack, getSpotifyToken };
