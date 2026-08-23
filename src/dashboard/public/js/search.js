/**
 * Search functionality for Meditea DJ Dashboard
 * Allows premium users to search and add songs to queue
 */

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format duration from milliseconds to MM:SS
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize search functionality
function initializeSearch(guildId, basePath, isPremium) {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchLoading = document.getElementById('search-loading');
    const searchEmpty = document.getElementById('search-empty');

    if (!searchInput || !isPremium) return;

    // Debounced search function
    const performSearch = debounce(async (query) => {
        if (!query || query.length < 2) {
            searchResults.style.display = 'none';
            searchEmpty.style.display = 'none';
            return;
        }

        // Show loading
        searchLoading.style.display = 'flex';
        searchResults.style.display = 'none';
        searchEmpty.style.display = 'none';

        try {
            const response = await fetch(`${basePath}/api/guilds/${guildId}/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            searchLoading.style.display = 'none';

            if (!data.tracks || data.tracks.length === 0) {
                searchEmpty.style.display = 'flex';
                return;
            }

            // Display results
            displaySearchResults(data.tracks, guildId, basePath);
        } catch (error) {
            console.error('Search error:', error);
            searchLoading.style.display = 'none';
            searchEmpty.style.display = 'flex';
        }
    }, 500);

    // Search input listener
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // Clear results when input is cleared
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchResults.style.display = 'none';
            searchEmpty.style.display = 'none';
        }
    });
}

// Display search results
function displaySearchResults(tracks, guildId, basePath) {
    const searchResults = document.getElementById('search-results');

    searchResults.innerHTML = tracks.map((track, index) => `
        <div class="search-result-item" data-index="${index}">
            <img src="${track.thumbnail || '/img/default-track.png'}" alt="${track.title}" class="result-thumbnail">
            <div class="result-info">
                <p class="result-title">${escapeHtml(track.title)}</p>
                <p class="result-author">${escapeHtml(track.author)}</p>
            </div>
            <span class="result-duration">${formatDuration(track.duration)}</span>
            <div class="result-actions">
                <button class="btn-result-action btn-add-queue" data-uri="${escapeHtml(track.uri)}" title="Añadir a la cola">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
                <button class="btn-result-action btn-play-now" data-uri="${escapeHtml(track.uri)}" title="Reproducir ahora">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    searchResults.style.display = 'block';

    // Add event listeners to action buttons
    searchResults.querySelectorAll('.btn-add-queue').forEach(btn => {
        btn.addEventListener('click', () => addToQueue(btn.dataset.uri, guildId, basePath, false));
    });

    searchResults.querySelectorAll('.btn-play-now').forEach(btn => {
        btn.addEventListener('click', () => addToQueue(btn.dataset.uri, guildId, basePath, true));
    });
}

// Add track to queue
async function addToQueue(trackUri, guildId, basePath, playNow = false) {
    try {
        const response = await fetch(`${basePath}/api/guilds/${guildId}/player/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trackUri, playNow })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(
                playNow ? 'Reproduciendo ahora' : 'Añadido a la cola',
                data.track ? `${data.track.title} - ${data.track.author}` : 'Canción añadida',
                'success'
            );

            // Clear search after adding
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
            }
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
        } else {
            showNotification('Error', data.error || 'No se pudo añadir la canción', 'error');
        }
    } catch (error) {
        console.error('Add to queue error:', error);
        showNotification('Error', 'Error al añadir la canción a la cola', 'error');
    }
}

// Show notification toast
function showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(message)}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Show animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after 5 seconds
    const timeout = setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(timeout);
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
