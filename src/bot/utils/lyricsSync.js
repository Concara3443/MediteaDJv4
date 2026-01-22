const { Client } = require('genius-lyrics');
const { getYouTubeMetadata } = require('./youtubeMetadata');

/**
 * Lyrics Synchronization Utility
 * Fetches and caches lyrics from Genius API
 */
class LyricsSync {
    constructor() {
        this.client = null;
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 1 hour in milliseconds

        // Initialize Genius client if token is available
        if (process.env.GENIUS_ACCESS_TOKEN) {
            this.client = new Client(process.env.GENIUS_ACCESS_TOKEN);
        } else {
            console.warn('[LyricsSync] GENIUS_ACCESS_TOKEN not found in environment variables');
        }
    }

    /**
     * Fetch lyrics for a track
     * @param {string} title - Track title
     * @param {string} artist - Track artist
     * @param {string} uri - Track URI (optional, for YouTube metadata)
     * @returns {Promise<Object|null>} Lyrics data or null
     */
    async fetchLyrics(title, artist, uri = null) {
        if (!this.client) {
            return {
                error: 'Genius API not configured',
                lyrics: null
            };
        }

        // Create cache key
        const cacheKey = `${artist}:${title}`.toLowerCase();

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Get clean metadata from YouTube if URI is provided
            let searchArtist = artist;
            let searchTitle = title;

            if (uri) {
                const metadata = await getYouTubeMetadata(uri);
                if (metadata) {
                    searchArtist = metadata.artist;
                    searchTitle = metadata.title;
                    console.log('[LyricsSync] ✅ Metadata de YouTube:', { searchArtist, searchTitle });
                } else {
                    console.log('[LyricsSync] ⚠️ Usando fallback (parámetros originales)');
                }
            }

            // Search for the song
            const searchQuery = `${searchArtist} ${searchTitle}`;
            const searches = await this.client.songs.search(searchQuery);

            if (!searches || searches.length === 0) {
                const result = {
                    error: 'No lyrics found',
                    lyrics: null,
                    title,
                    artist
                };
                this.addToCache(cacheKey, result);
                return result;
            }

            // Filtrar resultados para evitar discografías, álbumes, listas, etc.
            const filteredResults = searches.filter(song => {
                const songTitle = song.title.toLowerCase();
                const fullTitle = `${songTitle} ${song.artist.name.toLowerCase()}`;

                // Excluir discografías y listas
                if (songTitle.includes('discografía') ||
                    songTitle.includes('discography') ||
                    songTitle.includes('tracklist') ||
                    songTitle.includes('álbum') ||
                    songTitle.includes('album') ||
                    songTitle.includes(' list') ||
                    songTitle.includes('playlist') ||
                    songTitle.includes('collection') ||
                    songTitle.includes('canciones de ') ||
                    songTitle.includes('songs by ') ||
                    songTitle.includes('community') ||
                    songTitle.includes('favoritos') ||
                    songTitle.includes('favorites') ||
                    songTitle.includes('lieblingsalben') ||
                    songTitle.includes('top ') ||
                    songTitle.includes('best of') ||
                    songTitle.includes('greatest hits') ||
                    songTitle.match(/^\d{4}/) || // Empieza con año
                    fullTitle.includes('música en español') ||
                    fullTitle.includes('music in')) {
                    return false;
                }

                // Excluir si el título es solo el nombre del artista
                const artistName = song.artist.name.toLowerCase();
                if (songTitle === artistName || songTitle === `${artistName} lyrics`) {
                    return false;
                }

                return true;
            });

            // Si no quedan resultados después del filtro, usar los originales
            const resultsToUse = filteredResults.length > 0 ? filteredResults : searches;

            // Get the first result (most relevant)
            const song = resultsToUse[0];

            // Fetch full lyrics
            const lyrics = await song.lyrics();

            if (!lyrics) {
                const result = {
                    error: 'Lyrics not available',
                    lyrics: null,
                    title: song.title,
                    artist: song.artist.name
                };
                this.addToCache(cacheKey, result);
                return result;
            }

            const result = {
                lyrics,
                title: song.title,
                artist: song.artist.name,
                url: song.url,
                thumbnail: song.thumbnail,
                source: 'genius'
            };

            // Cache the result
            this.addToCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error('[LyricsSync] Error fetching lyrics:', error);
            return {
                error: 'Error fetching lyrics',
                lyrics: null,
                title,
                artist
            };
        }
    }

    /**
     * Get lyrics from cache
     * @param {string} key - Cache key
     * @returns {Object|null}
     */
    getFromCache(key) {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if cache has expired
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Add lyrics to cache
     * @param {string} key - Cache key
     * @param {Object} data - Lyrics data
     */
    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Cleanup old cache entries (keep cache size reasonable)
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache stats
     * @returns {Object}
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: 100,
            ttl: this.cacheTTL
        };
    }
}

// Export singleton instance
module.exports = new LyricsSync();
