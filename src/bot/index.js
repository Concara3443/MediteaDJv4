const MusicClient = require('./structures/MusicClient');

// Crear instancia del cliente
const client = new MusicClient();

// Iniciar el bot
client.start().catch(error => {
    console.error('[Bot] Error al iniciar:', error);
    process.exit(1);
});

// Exportar cliente para uso en dashboard
module.exports = client;
