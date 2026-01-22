const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

class DashboardServer {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.server = http.createServer(this.app);

        // Configurar Socket.IO (nginx hará el proxy desde /mediteadj/socket.io/ a /socket.io/)
        this.io = new Server(this.server, {
            path: '/socket.io/',
            cors: {
                origin: process.env.DASHBOARD_URL || '*',
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling']
        });

        this.port = process.env.DASHBOARD_PORT || 3000;

        // Guardar io en el cliente para que sea accesible desde eventos del bot
        this.client.io = this.io;

        this.setupMiddleware();
        this.setupAuth();
        this.setupRoutes();
        this.setupSocketIO();
    }

    setupMiddleware() {
        // Base path para cuando la app está montada en un subdirectorio
        const basePath = process.env.BASE_PATH || '';

        // View engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        // Static files (nginx ya maneja el rewrite de /mediteadj/ a /)
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Body parser
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Session
        this.app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
            }
        }));

        // Passport
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        // Middleware para agregar basePath a todas las vistas
        this.app.use((req, res, next) => {
            res.locals.basePath = basePath;
            next();
        });
    }

    setupAuth() {
        // Configurar estrategia de Discord OAuth2
        passport.use(new DiscordStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.REDIRECT_URI,
            scope: ['identify', 'guilds']
        }, (accessToken, refreshToken, profile, done) => {
            return done(null, profile);
        }));

        passport.serializeUser((user, done) => {
            done(null, user);
        });

        passport.deserializeUser((obj, done) => {
            done(null, obj);
        });

        // Middleware de autenticación
        this.checkAuth = (req, res, next) => {
            if (req.isAuthenticated()) return next();
            res.redirect('/login');
        };

        // Middleware para verificar si el usuario está en un guild
        this.checkGuildMember = (req, res, next) => {
            const guildId = req.params.guildId;
            const userGuilds = req.user.guilds || [];

            const isMember = userGuilds.some(guild => guild.id === guildId);
            if (!isMember) {
                return res.status(403).render('error', {
                    error: 'No tienes acceso a este servidor',
                    user: req.user
                });
            }
            next();
        };
    }

    setupRoutes() {
        // Rutas de autenticación
        const authRouter = require('./routes/auth')(passport);
        this.app.use('/auth', authRouter);

        // Rutas de API
        const apiRouter = require('./routes/api')(this.client, this.io, this.client.db);
        this.app.use('/api', this.checkAuth, apiRouter);

        // Rutas de vistas
        const viewsRouter = require('./routes/views')(this.client);
        this.app.use('/', viewsRouter);
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            socket.on('join-guild', (guildId) => {
                socket.join(`guild-${guildId}`);

                // Enviar estado inicial del player
                const player = this.client.kazagumo.players.get(guildId);
                if (player) {
                    socket.emit('player-update', this.getPlayerData(player));
                }
            });

            socket.on('leave-guild', (guildId) => {
                socket.leave(`guild-${guildId}`);
            });

            socket.on('disconnect', () => {
                // Cliente desconectado
            });
        });

        // Eventos de Kazagumo para emitir a los clientes
        this.client.kazagumo.on('playerStart', (player, track) => {
            this.io.to(`guild-${player.guildId}`).emit('player-update', this.getPlayerData(player));
        });

        this.client.kazagumo.on('playerEnd', (player) => {
            this.io.to(`guild-${player.guildId}`).emit('player-update', this.getPlayerData(player));
        });

        this.client.kazagumo.on('playerUpdate', (player) => {
            this.io.to(`guild-${player.guildId}`).emit('player-update', this.getPlayerData(player));
        });

        this.client.kazagumo.on('playerEmpty', (player) => {
            this.io.to(`guild-${player.guildId}`).emit('player-update', this.getPlayerData(player));
        });
    }

    getPlayerData(player) {
        if (!player) return null;

        return {
            connected: true,  // IMPORTANTE: Indicar que el player está conectado
            guildId: player.guildId,
            playing: player.playing,
            paused: player.paused,
            volume: player.volume,
            loop: player.loop,
            position: player.position,
            current: player.queue.current ? {
                title: player.queue.current.title,
                author: player.queue.current.author,
                duration: player.queue.current.length,
                thumbnail: player.queue.current.thumbnail,
                requester: player.queue.current.requester
            } : null,
            queue: player.queue.map(track => ({
                title: track.title,
                author: track.author,
                duration: track.length,
                thumbnail: track.thumbnail,
                requester: track.requester
            }))
        };
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`[Dashboard] ✅ Servidor iniciado en http://localhost:${this.port}`);
        });
    }
}

module.exports = DashboardServer;
