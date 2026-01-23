const { searchSpotifyTrack } = require('./spotifyMetadata');
const { searchMusicBrainz } = require('./musicbrainz');

/**
 * Obtiene título y artista limpios usando Spotify y MusicBrainz como fallback
 * @param {string} uri - URL del video de YouTube
 * @param {string} artist - Nombre del artista (del canal de YouTube)
 * @param {string} title - Título del video
 * @returns {Promise<{title: string, artist: string, videoId: string, originalTitle: string, hasMetadata: boolean, source: string}|null>}
 */
async function getYouTubeMetadata(uri, artist = null, title = null) {
    try {
        // Extraer video ID de la URL
        const videoId = extractVideoId(uri);
        if (!videoId) {
            console.log('[Metadata] URL no válida:', uri);
            return null;
        }

        // Si no se proporcionó artist/title, extraerlos de la URL (fallback)
        let searchArtist = artist;
        let searchTitle = title;
        let originalTitle = title;

        // 1. Intentar Spotify primero (más rápido)
        try {
            const spotifyMetadata = await searchSpotifyTrack(searchArtist, searchTitle);

            if (spotifyMetadata) {
                return {
                    title: spotifyMetadata.title,
                    artist: spotifyMetadata.artist,
                    album: spotifyMetadata.album,
                    videoId: videoId,
                    originalTitle: originalTitle,
                    hasMetadata: true,
                    source: 'spotify'
                };
            }
        } catch (spotifyError) {
            console.error('[Metadata] Error en Spotify:', spotifyError.message);
        }

        // 2. Fallback a MusicBrainz si Spotify no encontró
        try {
            console.log('[Metadata] Spotify no encontró, intentando MusicBrainz...');
            const mbMetadata = await searchMusicBrainz(searchArtist, searchTitle);

            if (mbMetadata) {
                return {
                    title: mbMetadata.title,
                    artist: mbMetadata.artist,
                    album: mbMetadata.album,
                    videoId: videoId,
                    originalTitle: originalTitle,
                    hasMetadata: true,
                    source: 'musicbrainz'
                };
            }
        } catch (mbError) {
            console.error('[Metadata] Error en MusicBrainz:', mbError.message);
        }

        // Si ninguno encontró metadata
        console.log('[Metadata] ❌ No se encontró en Spotify ni MusicBrainz');
        return null;

    } catch (error) {
        console.error('[Metadata] Error:', error.message);
        return null;
    }
}

/**
 * Extrae video ID de una URL de YouTube
 * @param {string} uri - URL de YouTube
 * @returns {string|null} Video ID o null
 */
function extractVideoId(uri) {
    const match = uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
}

module.exports = { getYouTubeMetadata, extractVideoId };
