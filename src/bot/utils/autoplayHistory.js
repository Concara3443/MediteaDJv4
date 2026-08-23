/**
 * Sistema de historial para autoplay
 * Evita que se repitan canciones en el autoplay
 */

// Map de guildId -> Set de identificadores de canciones
const guildHistory = new Map();

// Máximo de canciones en el historial por guild
const MAX_HISTORY_SIZE = 50;

/**
 * Genera un identificador único para una canción basado en título y artista
 * @param {string} title - Título de la canción
 * @param {string} artist - Artista de la canción
 * @returns {string} Identificador normalizado
 */
function generateTrackId(title, artist) {
    const normalizedTitle = (title || '').toLowerCase().trim()
        .replace(/\s*[\[(].*?[\])]/g, '') // Remover contenido entre paréntesis/corchetes
        .replace(/[^\w\s]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, ' '); // Normalizar espacios

    const normalizedArtist = (artist || '').toLowerCase().trim()
        .replace(/\s*-\s*topic$/i, '') // Remover "- Topic"
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ');

    return `${normalizedArtist}|${normalizedTitle}`;
}

/**
 * Añade una canción al historial de un guild
 * @param {string} guildId - ID del servidor
 * @param {string} title - Título de la canción
 * @param {string} artist - Artista de la canción
 * @param {string} uri - URI de la canción (opcional)
 */
function addToHistory(guildId, title, artist, uri = null) {
    if (!guildHistory.has(guildId)) {
        guildHistory.set(guildId, {
            tracks: new Set(),
            uris: new Set(),
            order: [] // Para mantener el orden y poder eliminar los más antiguos
        });
    }

    const history = guildHistory.get(guildId);
    const trackId = generateTrackId(title, artist);

    // Añadir al historial
    if (!history.tracks.has(trackId)) {
        history.tracks.add(trackId);
        history.order.push(trackId);

        // Si excede el máximo, eliminar el más antiguo
        if (history.order.length > MAX_HISTORY_SIZE) {
            const oldestId = history.order.shift();
            history.tracks.delete(oldestId);
        }
    }

    // También guardar URI si se proporciona
    if (uri) {
        history.uris.add(uri);
        if (history.uris.size > MAX_HISTORY_SIZE) {
            // Eliminar URIs antiguos (convertir a array, eliminar primero, volver a Set)
            const urisArray = Array.from(history.uris);
            history.uris = new Set(urisArray.slice(-MAX_HISTORY_SIZE));
        }
    }

    console.log(`[AutoplayHistory] Añadido al historial de ${guildId}: "${title}" - ${artist}`);
}

/**
 * Verifica si una canción ya está en el historial
 * @param {string} guildId - ID del servidor
 * @param {string} title - Título de la canción
 * @param {string} artist - Artista de la canción
 * @param {string} uri - URI de la canción (opcional)
 * @returns {boolean} true si ya está en el historial
 */
function isInHistory(guildId, title, artist, uri = null) {
    if (!guildHistory.has(guildId)) {
        return false;
    }

    const history = guildHistory.get(guildId);

    // Verificar por URI primero (más preciso)
    if (uri && history.uris.has(uri)) {
        return true;
    }

    // Verificar por título + artista
    const trackId = generateTrackId(title, artist);
    return history.tracks.has(trackId);
}

/**
 * Limpia el historial de un guild
 * @param {string} guildId - ID del servidor
 */
function clearHistory(guildId) {
    guildHistory.delete(guildId);
    console.log(`[AutoplayHistory] Historial limpiado para ${guildId}`);
}

/**
 * Obtiene el tamaño del historial de un guild
 * @param {string} guildId - ID del servidor
 * @returns {number} Número de canciones en el historial
 */
function getHistorySize(guildId) {
    if (!guildHistory.has(guildId)) {
        return 0;
    }
    return guildHistory.get(guildId).tracks.size;
}

module.exports = {
    addToHistory,
    isInHistory,
    clearHistory,
    getHistorySize,
    generateTrackId
};
