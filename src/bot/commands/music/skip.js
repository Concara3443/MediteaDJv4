const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta a la siguiente canción en la cola'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const currentTrack = player.queue.current;

        // Verificar si hay más canciones en la cola ANTES de saltar
        const queueSizeBeforeSkip = player.queue.size;

        console.log('[Skip] Cola antes de skip:', queueSizeBeforeSkip);

        // Intentar saltar
        player.skip();

        // Esperar un poco para que el skip se complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verificar si hay más canciones en la cola DESPUÉS de saltar
        const queueSizeAfterSkip = player.queue.size;
        console.log('[Skip] Cola después de skip:', queueSizeAfterSkip);

        if (queueSizeAfterSkip === 0) {
            // Verificar si autoplay está activado
            const autoplaySettings = await client.db.models.User.getAutoplaySettings(interaction.guildId);

            if (autoplaySettings.enabled) {
                // Buscar y añadir canción con autoplay
                try {
                    const searchQuery = `${currentTrack.author} ${currentTrack.title}`.substring(0, 100);
                    const result = await client.kazagumo.search(searchQuery, { requester: interaction.user });

                    if (result && result.tracks.length > 0) {
                        // Filtrar canciones no deseadas (comparar URIs)
                        const filteredTracks = result.tracks.filter(t => {
                            // Comparar URIs directamente (identificador único)
                            if (t.uri === currentTrack.uri) {
                                console.log('[Skip Autoplay] ❌ Misma URI, descartando:', t.title);
                                return false;
                            }
                            return true;
                        });

                        const tracksToUse = filteredTracks.length > 0 ? filteredTracks : result.tracks;
                        const randomIndex = Math.floor(Math.random() * Math.min(10, tracksToUse.length));
                        const randomTrack = tracksToUse[randomIndex];

                        player.queue.add(randomTrack);

                        // Reproducir la canción si el player no está reproduciendo
                        if (!player.playing && !player.paused) {
                            await player.play();
                        }

                        // Notificar al dashboard
                        if (client.io) {
                            const playerData = {
                                connected: true,
                                playing: player.playing,
                                paused: player.paused,
                                current: player.queue.current ? {
                                    title: player.queue.current.title,
                                    author: player.queue.current.author,
                                    duration: player.queue.current.length,
                                    thumbnail: player.queue.current.thumbnail
                                } : null,
                                queue: player.queue.map(track => ({
                                    title: track.title,
                                    author: track.author,
                                    duration: track.length
                                })),
                                position: player.position || 0,
                                volume: player.volume
                            };
                            client.io.to(`guild-${player.guildId}`).emit('player-update', playerData);
                        }

                        return interaction.reply({
                            embeds: [MusicEmbeds.success(
                                'Saltado',
                                `Se saltó **${currentTrack.title}**. Autoplay añadió: **${randomTrack.title}**`
                            )]
                        });
                    }
                } catch (error) {
                    console.error('[Skip] Error en autoplay:', error);
                }
            }

            return interaction.reply({
                embeds: [MusicEmbeds.success(
                    'Saltado',
                    `Se saltó **${currentTrack.title}**. No hay más canciones en la cola.`
                )]
            });
        }

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Saltado',
                `Se saltó **${currentTrack.title}**`
            )]
        });
    }
};
