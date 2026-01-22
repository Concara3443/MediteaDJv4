/**
 * Lyrics panel functionality for Meditea DJ Dashboard
 * Displays synchronized lyrics for premium users
 */

let currentTrack = null;
let lyricsCache = {};

/**
 * Initialize lyrics panel
 * @param {string} guildId - Guild ID
 * @param {string} basePath - Base path for API requests
 * @param {boolean} isPremium - Whether user is premium (deprecated, all users have access)
 * @param {Object} socket - Socket.IO instance
 */
function initializeLyrics(guildId, basePath, isPremium, socket) {
    const panel = document.getElementById('lyrics-panel');
    const closeBtn = document.getElementById('lyrics-close-btn');
    const fullscreenBtn = document.getElementById('lyrics-fullscreen-btn');

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('lyrics-panel-visible');
        });
    }

    // Fullscreen toggle
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            panel.classList.toggle('lyrics-panel-fullscreen');
        });
    }

    // Listen for player updates via socket
    if (socket) {
        socket.on('player-update', (data) => {
            handlePlayerUpdate(data, guildId, basePath);
        });
    }
}

/**
 * Handle player update to fetch lyrics
 * @param {Object} data - Player data
 * @param {string} guildId - Guild ID
 * @param {string} basePath - Base path
 */
async function handlePlayerUpdate(data, guildId, basePath) {
    const panel = document.getElementById('lyrics-panel');

    if (!data || !data.current) {
        // No track playing, show empty state
        showLyricsState('empty');
        currentTrack = null;
        return;
    }

    const track = data.current;

    // Check if this is a new track
    if (currentTrack && currentTrack.title === track.title && currentTrack.author === track.author) {
        // Same track, update scroll position based on progress
        updateLyricsScroll(data.position, track.duration);
        return;
    }

    // New track, fetch lyrics
    currentTrack = track;
    await fetchAndDisplayLyrics(track, guildId, basePath);

    // Show lyrics panel automatically when new track plays
    panel.classList.add('lyrics-panel-visible');
}

/**
 * Fetch and display lyrics
 * @param {Object} track - Track data
 * @param {string} guildId - Guild ID
 * @param {string} basePath - Base path
 */
async function fetchAndDisplayLyrics(track, guildId, basePath) {
    const cacheKey = `${track.author}:${track.title}`;

    // Check cache
    if (lyricsCache[cacheKey]) {
        displayLyrics(lyricsCache[cacheKey]);
        return;
    }

    // Show loading
    showLyricsState('loading');

    try {
        const response = await fetch(`${basePath}/api/guilds/${guildId}/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.author)}`);
        const data = await response.json();

        if (!response.ok || data.error || !data.lyrics) {
            showLyricsState('error');
            return;
        }

        // Cache lyrics
        lyricsCache[cacheKey] = data;

        // Display lyrics
        displayLyrics(data);
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        showLyricsState('error');
    }
}

/**
 * Display lyrics
 * @param {Object} data - Lyrics data
 */
function displayLyrics(data) {
    const lyricsText = document.getElementById('lyrics-text');

    if (!lyricsText) return;

    // Format lyrics with line breaks
    const formattedLyrics = data.lyrics
        .split('\n')
        .map(line => `<p class="lyrics-line">${escapeHtml(line) || '&nbsp;'}</p>`)
        .join('');

    lyricsText.innerHTML = `
        <div class="lyrics-header-info">
            <h4>${escapeHtml(data.title)}</h4>
            <p>${escapeHtml(data.artist)}</p>
        </div>
        <div class="lyrics-lines">
            ${formattedLyrics}
        </div>
    `;

    showLyricsState('text');
}

/**
 * Update lyrics scroll based on playback position
 * @param {number} position - Current position in ms
 * @param {number} duration - Total duration in ms
 */
function updateLyricsScroll(position, duration) {
    const lyricsText = document.getElementById('lyrics-text');
    const lyricsLines = lyricsText?.querySelector('.lyrics-lines');

    if (!lyricsLines) return;

    // Calculate progress percentage
    const progress = position / duration;

    // Scroll to approximate position (simple implementation)
    const scrollHeight = lyricsLines.scrollHeight - lyricsLines.clientHeight;
    const targetScroll = scrollHeight * progress;

    // Smooth scroll
    lyricsLines.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
}

/**
 * Show different lyrics states
 * @param {string} state - State to show ('loading', 'text', 'empty', 'error')
 */
function showLyricsState(state) {
    const states = ['lyrics-loading', 'lyrics-text', 'lyrics-empty', 'lyrics-error'];

    states.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            el.style.display = s === `lyrics-${state}` || s === state ? 'flex' : 'none';
        }
    });
}

/**
 * Escape HTML
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
