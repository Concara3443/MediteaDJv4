const express = require('express');

module.exports = (client, io, db) => {
    const router = express.Router();

    // Obtener información de un servidor
    router.get('/guilds/:guildId', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            // Verificar que el usuario tenga acceso
            const userGuilds = req.user.guilds || [];
            const hasAccess = userGuilds.some(g => g.id === guildId);

            if (!hasAccess) {
                return res.status(403).json({ error: 'No tienes acceso a este servidor' });
            }

            res.json({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount
            });
        } catch (error) {
            console.error('[API] Error al obtener guild:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Obtener estado del player
    router.get('/guilds/:guildId/player', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.json({ connected: false });
            }

            res.json({
                connected: true,
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
                    uri: player.queue.current.uri,
                    requester: {
                        id: player.queue.current.requester.id,
                        username: player.queue.current.requester.username,
                        avatar: player.queue.current.requester &&
                                typeof player.queue.current.requester.displayAvatarURL === 'function'
                            ? player.queue.current.requester.displayAvatarURL()
                            : 'https://cdn.discordapp.com/embed/avatars/0.png'
                    }
                } : null,
                queue: player.queue.map(track => ({
                    title: track.title,
                    author: track.author,
                    duration: track.length,
                    thumbnail: track.thumbnail,
                    uri: track.uri
                }))
            });
        } catch (error) {
            console.error('[API] Error al obtener player:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Reproducir/pausar
    router.post('/guilds/:guildId/player/pause', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(404).json({ error: 'No hay reproductor activo' });
            }

            player.pause(!player.paused);
            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({ paused: player.paused });
        } catch (error) {
            console.error('[API] Error al pausar/reanudar:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Saltar canción
    router.post('/guilds/:guildId/player/skip', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(404).json({ error: 'No hay reproductor activo' });
            }

            if (player.queue.length === 0) {
                return res.status(400).json({ error: 'No hay más canciones en la cola' });
            }

            player.skip();
            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({ success: true });
        } catch (error) {
            console.error('[API] Error al saltar:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Detener reproducción
    router.post('/guilds/:guildId/player/stop', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(404).json({ error: 'No hay reproductor activo' });
            }

            player.queue.clear();
            player.destroy();
            io.to(`guild-${guildId}`).emit('player-update', null);

            res.json({ success: true });
        } catch (error) {
            console.error('[API] Error al detener:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Cambiar volumen
    router.post('/guilds/:guildId/player/volume', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { volume } = req.body;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(404).json({ error: 'No hay reproductor activo' });
            }

            if (typeof volume !== 'number' || volume < 0 || volume > 100) {
                return res.status(400).json({ error: 'Volumen inválido (0-100)' });
            }

            player.setVolume(volume);
            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({ volume: player.volume });
        } catch (error) {
            console.error('[API] Error al cambiar volumen:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Cambiar modo loop
    router.post('/guilds/:guildId/player/loop', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { mode } = req.body;
            const player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(404).json({ error: 'No hay reproductor activo' });
            }

            const validModes = ['none', 'track', 'queue'];
            if (!validModes.includes(mode)) {
                return res.status(400).json({ error: 'Modo inválido (none/track/queue)' });
            }

            player.setLoop(mode);
            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({ loop: player.loop });
        } catch (error) {
            console.error('[API] Error al cambiar loop:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Buscar y reproducir
    router.post('/guilds/:guildId/player/play', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { query } = req.body;

            if (!query) {
                return res.status(400).json({ error: 'Se requiere una query' });
            }

            // Buscar la canción
            const result = await client.kazagumo.search(query, { requester: req.user });

            if (!result || !result.tracks.length) {
                return res.status(404).json({ error: 'No se encontraron resultados' });
            }

            // Obtener o crear player
            let player = client.kazagumo.players.get(guildId);

            if (!player) {
                // Necesitamos saber en qué canal de voz está el usuario
                // Esto normalmente se haría desde Discord, aquí solo devolvemos un error
                return res.status(400).json({
                    error: 'Usa el comando /play desde Discord para iniciar el reproductor'
                });
            }

            // Añadir track a la cola
            const track = result.tracks[0];
            player.queue.add(track);

            if (!player.playing && !player.paused) {
                await player.play();
            }

            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({
                success: true,
                track: {
                    title: track.title,
                    author: track.author,
                    duration: track.length
                }
            });
        } catch (error) {
            console.error('[API] Error al reproducir:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Search for tracks
    router.get('/guilds/:guildId/search', async (req, res) => {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            // Search using Kazagumo
            const result = await client.kazagumo.search(query, {
                requester: req.user
            });

            if (!result || !result.tracks || result.tracks.length === 0) {
                return res.json({ tracks: [] });
            }

            // Return top 10 results
            const tracks = result.tracks.slice(0, 10).map(track => ({
                title: track.title,
                author: track.author,
                duration: track.length,
                thumbnail: track.thumbnail,
                uri: track.uri
            }));

            res.json({ tracks });
        } catch (error) {
            console.error('[API] Error searching tracks:', error);
            res.status(500).json({ error: 'Error al buscar canciones' });
        }
    });

    // Get lyrics for current track
    router.get('/guilds/:guildId/lyrics', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { title, artist } = req.query;

            if (!title || !artist) {
                return res.status(400).json({ error: 'Title and artist are required' });
            }

            // Get the player to extract the URI
            const player = client.kazagumo.players.get(guildId);
            let trackUri = null;

            if (player && player.queue.current && player.queue.current.uri) {
                trackUri = player.queue.current.uri;
            }

            // SOLO funcionar si la canción tiene metadata de Spotify
            if (trackUri && trackUri.includes('youtube.com')) {
                const { getYouTubeMetadata } = require('../../bot/utils/youtubeMetadata');

                try {
                    const metadata = await getYouTubeMetadata(trackUri, artist, title);

                    if (!metadata || !metadata.hasMetadata) {
                        console.log('[API Lyrics] ❌ Canción sin metadata de Spotify');
                        return res.json({
                            error: 'Esta canción no tiene metadata de Spotify. Las letras solo están disponibles para canciones con metadata limpia.',
                            lyrics: null
                        });
                    }

                    console.log('[API Lyrics] ✅ Metadata verificada:', metadata.title);
                } catch (error) {
                    console.error('[API Lyrics] Error verificando metadata:', error.message);
                    return res.json({
                        error: 'No se pudo verificar la metadata de la canción',
                        lyrics: null
                    });
                }
            }

            // Use lyrics sync utility
            const lyricsSync = require('../../bot/utils/lyricsSync');
            const result = await lyricsSync.fetchLyrics(title, artist, trackUri);

            if (result.error) {
                return res.json({
                    error: result.error,
                    lyrics: null
                });
            }

            res.json(result);
        } catch (error) {
            console.error('[API] Error fetching lyrics:', error);
            res.status(500).json({ error: 'Error al obtener las letras' });
        }
    });

    // Add track to queue from dashboard
    router.post('/guilds/:guildId/player/add', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { trackUri, playNow } = req.body;

            if (!trackUri) {
                return res.status(400).json({ error: 'trackUri is required' });
            }

            // Get player
            let player = client.kazagumo.players.get(guildId);

            if (!player) {
                return res.status(400).json({
                    error: 'No hay reproductor activo. Usa /play en Discord primero.'
                });
            }

            // Search for the track by URI
            const result = await client.kazagumo.search(trackUri, {
                requester: req.user
            });

            if (!result || !result.tracks || result.tracks.length === 0) {
                return res.status(404).json({ error: 'No se encontró la canción' });
            }

            const track = result.tracks[0];

            if (playNow) {
                // Clear queue and play immediately
                player.queue.clear();
                player.queue.add(track);
                if (!player.playing) {
                    await player.play();
                } else {
                    player.skip();
                }
            } else {
                // Add to queue
                player.queue.add(track);
                if (!player.playing && !player.paused) {
                    await player.play();
                }
            }

            // Emit socket update
            io.to(`guild-${guildId}`).emit('player-update', getPlayerData(player));

            res.json({
                success: true,
                track: {
                    title: track.title,
                    author: track.author,
                    duration: track.length
                }
            });
        } catch (error) {
            console.error('[API] Error adding track:', error);
            res.status(500).json({ error: 'Error al añadir la canción' });
        }
    });

    // Función auxiliar para obtener datos del player
    function getPlayerData(player) {
        if (!player) return null;

        return {
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
                thumbnail: track.thumbnail
            }))
        };
    }

    return router;
};
