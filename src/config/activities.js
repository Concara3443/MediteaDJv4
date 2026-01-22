const { ActivityType } = require('discord.js');

/**
 * Configuración de actividades rotativas del bot
 * Las variables {servers} y {users} se reemplazan dinámicamente
 */
module.exports = {
    activities: [
        { name: '🎵 Música para ti', type: ActivityType.Playing },
        { name: '🎧 /play para empezar', type: ActivityType.Listening },
        { name: '✈️ Meditea Airlines', type: ActivityType.Playing },
        { name: '🌐 Visita el dashboard web', type: ActivityType.Watching },
        { name: '🎶 En {servers} servidores', type: ActivityType.Playing },
        { name: '📊 {users} usuarios escuchando', type: ActivityType.Watching },
        { name: '🎼 Música sin fronteras', type: ActivityType.Playing }
    ],
    rotationInterval: 60000, // 60 segundos
    status: 'online'
};
