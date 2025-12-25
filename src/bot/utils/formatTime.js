/**
 * Formatea milisegundos a formato legible (HH:MM:SS o MM:SS)
 * @param {number} ms - Milisegundos
 * @returns {string} Tiempo formateado
 */
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const padZero = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${padZero(minutes)}:${padZero(seconds)}`;
    }
    return `${minutes}:${padZero(seconds)}`;
}

/**
 * Crea una barra de progreso visual
 * @param {number} current - Posición actual en ms
 * @param {number} total - Duración total en ms
 * @param {number} length - Longitud de la barra (default: 15)
 * @returns {string} Barra de progreso
 */
function progressBar(current, total, length = 15) {
    const progress = Math.floor((current / total) * length);
    const emptyProgress = length - progress;

    const progressText = '▓'.repeat(progress);
    const emptyProgressText = '░'.repeat(emptyProgress);

    return `${progressText}${emptyProgressText}`;
}

/**
 * Formatea un número grande con separadores
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
    formatTime,
    progressBar,
    formatNumber
};
