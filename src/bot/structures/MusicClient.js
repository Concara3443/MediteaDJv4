const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { Kazagumo, KazagumoPlayer, Plugins } = require('kazagumo');
const { Connectors } = require('shoukaku');
const fs = require('fs');
const path = require('path');

class MusicClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages
            ],
            shards: 'auto'
        });

        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.kazagumo = null;

        this.config = {
            token: process.env.DISCORD_TOKEN,
            clientId: process.env.CLIENT_ID,
            ownerId: process.env.OWNER_ID,
            guildId: process.env.GUILD_ID,
            commandScope: process.env.COMMAND_SCOPE || 'guild'
        };
    }

    async initialize() {
        // Configuración de Lavalink
        const lavalinkConfig = {
            name: 'Lavalink',
            url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
            auth: process.env.LAVALINK_PASSWORD,
            secure: false
        };

        console.log('[Lavalink] Configuración:', {
            url: lavalinkConfig.url,
            password: lavalinkConfig.auth ? '***' : 'NO CONFIGURADO'
        });

        // Inicializar Kazagumo (Lavalink)
        this.kazagumo = new Kazagumo(
            {
                defaultSearchEngine: 'youtube',
                plugins: [
                    new Plugins.PlayerMoved(this)
                ],
                send: (guildId, payload) => {
                    const guild = this.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                }
            },
            new Connectors.DiscordJS(this),
            [lavalinkConfig]
        );

        // Event listeners de Kazagumo
        this.kazagumo.shoukaku.on('ready', (name) => {
            console.log(`[Lavalink] ✅ Nodo ${name} está listo y conectado`);

            // Actualizar presencia si el bot ya está listo
            if (this.isReady()) {
                this.user.setPresence({
                    activities: [{
                        name: '🎵 Música para ti',
                        type: 3 // ActivityType.Playing
                    }],
                    status: 'online'
                });
            }
        });

        this.kazagumo.shoukaku.on('error', (name, error) => {
            console.error(`[Lavalink] ❌ Error en nodo ${name}:`, error);
        });

        this.kazagumo.shoukaku.on('close', (name, code, reason) => {
            console.log(`[Lavalink] ⚠️ Nodo ${name} cerrado. Código: ${code}, Razón: ${reason}`);
        });

        this.kazagumo.shoukaku.on('disconnect', (name, count) => {
            console.log(`[Lavalink] ⚠️ Nodo ${name} desconectado. Intentos de reconexión: ${count}`);
        });

        this.kazagumo.shoukaku.on('reconnecting', (name, tries) => {
            console.log(`[Lavalink] 🔄 Reconectando nodo ${name}... Intento ${tries}`);
        });

        // Cargar comandos
        this.loadCommands();

        // Cargar eventos
        this.loadEvents();

        console.log('[MusicClient] Cliente inicializado correctamente');
    }

    loadCommands() {
        const commandFolders = ['music', 'playlists'];

        for (const folder of commandFolders) {
            const commandsPath = path.join(__dirname, '..', 'commands', folder);

            if (!fs.existsSync(commandsPath)) {
                console.log(`[Commands] Carpeta ${folder} no encontrada, saltando...`);
                continue;
            }

            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                try {
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                    } else {
                        console.log(`[Commands] ⚠️ El comando en ${filePath} no tiene data o execute`);
                    }
                } catch (error) {
                    console.error(`[Commands] Error al cargar ${filePath}:`, error);
                }
            }
        }

        console.log(`[Commands] Total de comandos cargados: ${this.commands.size}`);
    }

    loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');

        if (!fs.existsSync(eventsPath)) {
            console.log('[Events] Carpeta de eventos no encontrada');
            return;
        }

        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            try {
                const event = require(filePath);

                if (event.once) {
                    this.once(event.name, (...args) => event.execute(...args, this));
                } else {
                    this.on(event.name, (...args) => event.execute(...args, this));
                }
            } catch (error) {
                console.error(`[Events] Error al cargar ${filePath}:`, error);
            }
        }
    }

    async registerCommands() {
        const { REST, Routes } = require('discord.js');
        const commands = [];

        this.commands.forEach(command => {
            commands.push(command.data);
        });

        const rest = new REST().setToken(this.config.token);

        try {
            // PASO 1: Borrar todos los comandos existentes
            console.log('[Commands] 🗑️ Borrando comandos anteriores...');

            // Borrar comandos de guild si existe
            if (this.config.guildId) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
                        { body: [] }
                    );
                    console.log(`[Commands] ✅ Comandos de guild ${this.config.guildId} borrados`);
                } catch (err) {
                    console.log(`[Commands] ⚠️ No se pudieron borrar comandos de guild:`, err.message);
                }
            }

            // Borrar comandos globales
            try {
                await rest.put(
                    Routes.applicationCommands(this.config.clientId),
                    { body: [] }
                );
                console.log('[Commands] ✅ Comandos globales borrados');
            } catch (err) {
                console.log('[Commands] ⚠️ No se pudieron borrar comandos globales:', err.message);
            }

            // PASO 2: Registrar comandos GLOBALMENTE
            console.log(`[Commands] 📤 Registrando ${commands.length} comandos GLOBALMENTE...`);
            const data = await rest.put(
                Routes.applicationCommands(this.config.clientId),
                { body: commands }
            );
            console.log(`[Commands] ✅ ${data.length} comandos registrados GLOBALMENTE (tardarán ~1 hora en aparecer)`);

        } catch (error) {
            console.error('[Commands] ❌ Error al registrar comandos:', error);
        }
    }

    async start() {
        await this.initialize();
        await this.login(this.config.token);
    }
}

module.exports = MusicClient;
