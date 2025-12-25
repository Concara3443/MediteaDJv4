const DashboardServer = require('./server');

// Obtener instancia del bot
const bot = require('../bot');

// Esperar a que el bot esté listo antes de iniciar el dashboard
bot.once('ready', () => {
    console.log('[Dashboard] Bot está listo, iniciando dashboard...');

    // Crear instancia del dashboard
    const dashboard = new DashboardServer(bot);

    // Iniciar servidor
    dashboard.start();
});

module.exports = bot;
