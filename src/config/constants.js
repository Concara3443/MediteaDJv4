module.exports = {
    // Colores corporativos de Meditea Airlines
    COLORS: {
        PRIMARY: 0x00F3F0,    // Azul Meditea
        SUCCESS: 0xFFC200,    // Naranja Meditea
        ERROR: 0xED4245,      // Rojo
        WARNING: 0xFFC200,    // Naranja Meditea
        INFO: 0x00F3F0,       // Azul Meditea
        MUSIC: 0x00F3F0       // Azul Meditea
    },

    // Emojis
    EMOJIS: {
        PLAY: '▶️',
        PAUSE: '⏸️',
        STOP: '⏹️',
        SKIP: '⏭️',
        PREVIOUS: '⏮️',
        SHUFFLE: '🔀',
        LOOP: '🔁',
        LOOP_ONE: '🔂',
        VOLUME: '🔊',
        MUSIC: '🎵',
        PLAYLIST: '📝',
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        LOADING: '⏳'
    },

    // Límites
    LIMITS: {
        QUEUE_SIZE: 100,              // Máximo de canciones en cola
        PLAYLIST_SIZE: 50,            // Máximo de canciones por playlist
        QUEUE_PAGE_SIZE: 10,          // Canciones por página en /queue
        PLAYLIST_PAGE_SIZE: 10,       // Playlists por página
        SEARCH_RESULTS: 5,            // Resultados de búsqueda
        VOLUME_MIN: 0,
        VOLUME_MAX: 100,
        VOLUME_DEFAULT: 50,
        SEEK_MAX: 24 * 60 * 60 * 1000 // 24 horas en ms
    },

    // Timeouts
    TIMEOUTS: {
        COMMAND_COOLDOWN: 3000,       // 3 segundos
        PLAYER_DESTROY: 30000,        // 30 segundos de inactividad
        MESSAGE_DELETE: 10000         // Eliminar mensajes después de 10s
    },

    // Loop modes
    LOOP_MODES: {
        NONE: 'none',
        TRACK: 'track',
        QUEUE: 'queue'
    },

    // Fuentes de música soportadas
    MUSIC_SOURCES: {
        YOUTUBE: 'youtube',
        SPOTIFY: 'spotify',
        SOUNDCLOUD: 'soundcloud',
        BANDCAMP: 'bandcamp'
    }
};
