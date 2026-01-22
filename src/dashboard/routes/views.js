const express = require('express');

module.exports = (client) => {
    const router = express.Router();

    // Middleware de autenticación
    const checkAuth = (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/login');
    };

    // Página de inicio
    router.get('/', (req, res) => {
        res.render('index', {
            user: req.user,
            bot: {
                username: client.user?.username,
                avatar: client.user?.displayAvatarURL(),
                serverCount: client.guilds.cache.size * 10
            }
        });
    });

    // Página de login
    router.get('/login', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.render('login', {
            user: null
        });
    });

    // Dashboard principal (lista de servidores)
    router.get('/dashboard', checkAuth, (req, res) => {
        const userGuilds = req.user.guilds || [];
        const botGuilds = client.guilds.cache;

        // Filtrar solo los servidores donde el bot está presente
        const mutualGuilds = userGuilds
            .filter(userGuild => botGuilds.has(userGuild.id))
            .map(userGuild => {
                const botGuild = botGuilds.get(userGuild.id);
                return {
                    id: userGuild.id,
                    name: userGuild.name,
                    icon: userGuild.icon
                        ? `https://cdn.discordapp.com/icons/${userGuild.id}/${userGuild.icon}.png`
                        : '/img/default-server.png',
                    memberCount: botGuild.memberCount,
                    hasPlayer: client.kazagumo.players.has(userGuild.id)
                };
            });

        res.render('dashboard', {
            user: req.user,
            guilds: mutualGuilds
        });
    });

    // Dashboard de un servidor específico
    router.get('/dashboard/:guildId', checkAuth, async (req, res) => {
        const guildId = req.params.guildId;
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return res.status(404).render('error', {
                error: 'Servidor no encontrado',
                user: req.user
            });
        }

        // Verificar que el usuario tenga acceso
        const userGuilds = req.user.guilds || [];
        const hasAccess = userGuilds.some(g => g.id === guildId);

        if (!hasAccess) {
            return res.status(403).render('error', {
                error: 'No tienes acceso a este servidor',
                user: req.user
            });
        }

        const player = client.kazagumo.players.get(guildId);

        // Check if user is premium
        let isPremium = false;
        try {
            if (client.db && client.db.models && client.db.models.User) {
                isPremium = await client.db.models.User.isPremium(req.user.id);
            }
        } catch (error) {
            console.error('[Views] Error checking premium status:', error);
        }

        res.render('guild-dashboard', {
            user: {
                ...req.user,
                isPremium
            },
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL() || '/img/default-server.png',
                memberCount: guild.memberCount
            },
            player: player ? {
                connected: true,
                playing: player.playing,
                paused: player.paused,
                volume: player.volume,
                loop: player.loop
            } : {
                connected: false
            }
        });
    });

    return router;
};
