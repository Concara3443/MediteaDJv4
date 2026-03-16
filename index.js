require('dotenv').config();
const DatabaseManager = require('./src/database');
const path = require('path');

// ASCII Art del bot
console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║            Meditea DJ v4.0 - Music Bot                ║
║         Discord Music Bot with Web Dashboard          ║
║              Powered by Meditea Airlines              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);

// Inicializar base de datos
console.log('[Main] Inicializando base de datos...');
const dbManager = new DatabaseManager(process.env.DATABASE_PATH || './data/database.db');

// Variable global para el bot (accesible en handlers de señales)
let bot = null;

(async () => {
    const db = await dbManager.initialize();

    // Guardar instancias de DB globalmente
    global.db = db;
    global.dbManager = dbManager;

    // Iniciar el bot de Discord
    console.log('[Main] Iniciando bot de Discord...');
    bot = require('./src/bot');

    // Iniciar el dashboard (solo si no estamos en modo bot-only)
    if (process.env.ENABLE_DASHBOARD !== 'false') {
        console.log('[Main] Iniciando dashboard web...');
        const dashboard = require('./src/dashboard');
    }

    console.log('[Main] Aplicación iniciada exitosamente');
    console.log('[Main] Presiona Ctrl+C para detener');
})().catch(error => {
    console.error('[Main] Error durante la inicialización:', error);
    process.exit(1);
});

// Manejo de errores y señales
process.on('unhandledRejection', (error) => {
    console.error('[Main] Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
    console.log('\n[Main] Recibida señal SIGINT. Cerrando gracefully...');

    if (bot && bot.destroy) {
        await bot.destroy();
    }

    dbManager.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Main] Recibida señal SIGTERM. Cerrando gracefully...');

    if (bot && bot.destroy) {
        await bot.destroy();
    }

    dbManager.close();
    process.exit(0);
});
