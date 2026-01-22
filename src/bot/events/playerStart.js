const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../config/constants');
const { getYouTubeMetadata } = require('../utils/youtubeMetadata');

// Map para almacenar los mensajes de "now playing" por guild
const nowPlayingMessages = new Map();

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        // Evento cuando empieza una canción
        client.kazagumo.on('playerStart', async (player, track) => {
            // Obtener metadata limpia de Spotify
            let cleanMetadata = null;
            if (track.uri && track.uri.includes('youtube.com')) {
                try {
                    cleanMetadata = await getYouTubeMetadata(track.uri, track.author, track.title);
                } catch (error) {
                    console.error('[PlayerStart] Error al obtener metadata:', error.message);
                }
            }

            // Log de la metadata de la canción
            console.log('========================================');
            console.log('🎵 REPRODUCIENDO CANCIÓN:');
            if (cleanMetadata && cleanMetadata.hasMetadata) {
                console.log('   ✅ Metadata de YouTube Music:');
                console.log('   Título:', cleanMetadata.title);
                console.log('   Artista:', cleanMetadata.artist);
                console.log('   Título original:', cleanMetadata.originalTitle);
            } else {
                console.log('   ⚠️ Sin metadata de YouTube Music:');
                console.log('   Título:', track.title);
                console.log('   Artista:', track.author);
            }
            console.log('   URL:', track.uri);
            console.log('   Duración:', formatTime(track.length));
            console.log('========================================');

            const channel = client.channels.cache.get(player.textId);
            if (!channel) return;

            // Verificar autoplay proactivo (mantener mínimo 2 canciones en cola)
            const autoplaySettings = await client.db.models.User.getAutoplaySettings(player.guildId);
            if (autoplaySettings.enabled && player.queue.size < 2) {
                console.log('[Autoplay Proactivo] Cola tiene', player.queue.size, 'canciones, añadiendo una más...');
                try {
                    // Determinar query de búsqueda basado en metadata
                    let searchQuery;
                    if (cleanMetadata && cleanMetadata.hasMetadata) {
                        // Usar metadata limpia para buscar canciones relacionadas
                        searchQuery = `${cleanMetadata.artist} ${cleanMetadata.title}`.substring(0, 100);
                        console.log('[Autoplay Proactivo] 🎵 Usando metadata limpia para búsqueda');
                    } else {
                        // Usar título original pero buscar igualmente
                        searchQuery = `${track.author} ${track.title}`.substring(0, 100);
                        console.log('[Autoplay Proactivo] ⚠️ Canción actual sin metadata, buscando canciones con metadata...');
                    }

                    const result = await client.kazagumo.search(searchQuery, { requester: { id: 'autoplay', username: 'Autoplay' } });

                    if (result && result.tracks.length > 0) {
                        console.log('[Autoplay Proactivo] Resultados:', result.tracks.slice(0, 5).map(t => t.title));

                        // Filtrar canciones que no sean la actual Y que tengan metadata
                        const filteredTracks = [];
                        for (const t of result.tracks) {
                            // Saltar si es la misma canción
                            if (t.uri === track.uri) {
                                console.log('[Autoplay Proactivo] ❌ Misma URI, descartando:', t.title);
                                continue;
                            }

                            // Verificar si tiene metadata de Spotify
                            try {
                                const trackMetadata = await getYouTubeMetadata(t.uri, t.author, t.title);
                                if (trackMetadata && trackMetadata.hasMetadata) {
                                    // Verificar duplicado con canción actual (mismo título+artista)
                                    if (cleanMetadata &&
                                        trackMetadata.title.toLowerCase().trim() === cleanMetadata.title.toLowerCase().trim() &&
                                        trackMetadata.artist.toLowerCase().trim() === cleanMetadata.artist.toLowerCase().trim()) {
                                        console.log('[Autoplay Proactivo] ❌ Duplicado (mismo título+artista):', trackMetadata.title);
                                        continue;
                                    }

                                    // Verificar duplicado con canciones ya añadidas
                                    const isDuplicate = filteredTracks.some(ft =>
                                        ft.metadata.title.toLowerCase().trim() === trackMetadata.title.toLowerCase().trim() &&
                                        ft.metadata.artist.toLowerCase().trim() === trackMetadata.artist.toLowerCase().trim()
                                    );

                                    if (isDuplicate) {
                                        console.log('[Autoplay Proactivo] ❌ Duplicado en cola:', trackMetadata.title);
                                        continue;
                                    }

                                    // Guardar track con su metadata
                                    filteredTracks.push({ track: t, metadata: trackMetadata });
                                    console.log('[Autoplay Proactivo] ✅ Con metadata:', trackMetadata.title);
                                } else {
                                    console.log('[Autoplay Proactivo] ❌ Sin metadata, descartando:', t.title);
                                }
                            } catch (error) {
                                console.log('[Autoplay Proactivo] ❌ Error verificando metadata:', t.title);
                            }

                            // Limitar a 5 verificaciones para no hacer demasiadas llamadas
                            if (filteredTracks.length >= 5) break;
                        }

                        if (filteredTracks.length === 0) {
                            console.log('[Autoplay Proactivo] ❌ No se encontraron canciones con metadata');
                            return;
                        }

                        const randomIndex = Math.floor(Math.random() * filteredTracks.length);
                        const randomItem = filteredTracks[randomIndex];
                        const randomTrack = randomItem.track;

                        player.queue.add(randomTrack);
                        console.log('[Autoplay Proactivo] Añadida:', randomItem.metadata.title, 'por', randomItem.metadata.artist);

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
                    }
                } catch (error) {
                    console.error('[Autoplay Proactivo] Error:', error);
                }
            }

            // Crear embed con información de la canción
            const embed = createNowPlayingEmbed(track, player);

            // Crear botones de control
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_previous')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true), // Deshabilitado por ahora (no hay sistema de historial)
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setEmoji('⏸️')
                        .setLabel('Pausar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setEmoji('⏭️')
                        .setLabel('Skip')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji('⏹️')
                        .setLabel('Stop')
                        .setStyle(ButtonStyle.Danger)
                );

            try {
                // Borrar el mensaje anterior si existe
                const oldMessage = nowPlayingMessages.get(player.guildId);
                if (oldMessage) {
                    try {
                        await oldMessage.delete();
                    } catch (err) {
                        // Mensaje ya borrado o no existe
                    }
                }

                // Enviar nuevo mensaje
                const message = await channel.send({
                    embeds: [embed],
                    components: [row]
                });

                // Guardar el mensaje para poder actualizarlo
                nowPlayingMessages.set(player.guildId, message);

                // Actualizar el embed cada 10 segundos
                const updateInterval = setInterval(async () => {
                    // Si el player no existe o no hay canción, limpiar
                    const currentPlayer = client.kazagumo.players.get(player.guildId);
                    if (!currentPlayer || (!currentPlayer.playing && !currentPlayer.paused)) {
                        clearInterval(updateInterval);
                        return;
                    }

                    // Si la canción cambió, limpiar (el nuevo evento playerStart se encargará)
                    if (currentPlayer.queue.current?.encoded !== track.encoded) {
                        clearInterval(updateInterval);
                        return;
                    }

                    try {
                        // Actualizar embed
                        const updatedEmbed = createNowPlayingEmbed(track, currentPlayer);

                        // Actualizar botones según el estado
                        const updatedRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('music_previous')
                                    .setEmoji('⏮️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId(currentPlayer.paused ? 'music_resume' : 'music_pause')
                                    .setEmoji(currentPlayer.paused ? '▶️' : '⏸️')
                                    .setLabel(currentPlayer.paused ? 'Reanudar' : 'Pausar')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('music_skip')
                                    .setEmoji('⏭️')
                                    .setLabel('Skip')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('music_stop')
                                    .setEmoji('⏹️')
                                    .setLabel('Stop')
                                    .setStyle(ButtonStyle.Danger)
                            );

                        await message.edit({
                            embeds: [updatedEmbed],
                            components: [updatedRow]
                        });
                    } catch (err) {
                        // Error al actualizar (mensaje borrado, etc)
                        clearInterval(updateInterval);
                    }
                }, 10000); // Actualizar cada 10 segundos

            } catch (error) {
                console.error('[PlayerStart] Error al enviar mensaje:', error);
            }
        });

        // Evento cuando termina una canción
        client.kazagumo.on('playerEnd', async (player, track) => {
            // Esperar un poco para que la cola se actualice
            setTimeout(async () => {
                const currentPlayer = client.kazagumo.players.get(player.guildId);

                // Verificar si el player existe y si la cola está vacía
                if (!currentPlayer) return;

                // Si no hay canción actual y la cola está vacía
                if (!currentPlayer.queue.current && currentPlayer.queue.size === 0) {
                    // Verificar si autoplay está activado
                    const autoplaySettings = await client.db.models.User.getAutoplaySettings(player.guildId);

                    let autoplaySuccess = false;

                    if (autoplaySettings.enabled && track) {
                        // Verificar si la canción que terminó tiene metadata
                        let trackMetadata = null;
                        if (track.uri && track.uri.includes('youtube.com')) {
                            try {
                                trackMetadata = await getYouTubeMetadata(track.uri, track.author, track.title);
                            } catch (error) {
                                console.error('[Autoplay] Error al obtener metadata:', error.message);
                            }
                        }

                        // Buscar una canción relacionada (SIEMPRE, pero solo añadir si tiene metadata)
                        try {
                            const channel = client.channels.cache.get(player.textId);

                            // Determinar query de búsqueda
                            let searchQuery;
                            if (trackMetadata && trackMetadata.hasMetadata) {
                                // Usar metadata limpia para buscar
                                searchQuery = `${trackMetadata.artist} ${trackMetadata.title}`.substring(0, 100);
                                console.log('[Autoplay] 🎵 Usando metadata limpia para búsqueda');
                            } else {
                                // Usar título original pero buscar igualmente
                                searchQuery = `${track.author} ${track.title}`.substring(0, 100);
                                console.log('[Autoplay] ⚠️ Canción sin metadata, buscando canciones con metadata...');
                            }

                            const result = await client.kazagumo.search(searchQuery, { requester: { id: 'autoplay', username: 'Autoplay' } });

                            if (result && result.tracks.length > 0) {
                                console.log('[Autoplay] Resultados de búsqueda:', result.tracks.slice(0, 10).map(t => t.title));

                                // Filtrar canciones con metadata
                                const filteredTracks = [];
                                for (const t of result.tracks) {
                                    if (t.uri === track.uri) {
                                        console.log('[Autoplay] ❌ Misma URI, descartando:', t.title);
                                        continue;
                                    }

                                    // Verificar metadata de Spotify
                                    try {
                                        const candidateMetadata = await getYouTubeMetadata(t.uri, t.author, t.title);
                                        if (candidateMetadata && candidateMetadata.hasMetadata) {
                                            // Verificar duplicado con canción que terminó (mismo título+artista)
                                            if (trackMetadata &&
                                                candidateMetadata.title.toLowerCase().trim() === trackMetadata.title.toLowerCase().trim() &&
                                                candidateMetadata.artist.toLowerCase().trim() === trackMetadata.artist.toLowerCase().trim()) {
                                                console.log('[Autoplay] ❌ Duplicado (mismo título+artista):', candidateMetadata.title);
                                                continue;
                                            }

                                            // Verificar duplicado con canciones ya añadidas
                                            const isDuplicate = filteredTracks.some(ft =>
                                                ft.metadata.title.toLowerCase().trim() === candidateMetadata.title.toLowerCase().trim() &&
                                                ft.metadata.artist.toLowerCase().trim() === candidateMetadata.artist.toLowerCase().trim()
                                            );

                                            if (isDuplicate) {
                                                console.log('[Autoplay] ❌ Duplicado en cola:', candidateMetadata.title);
                                                continue;
                                            }

                                            // Guardar track con su metadata
                                            filteredTracks.push({ track: t, metadata: candidateMetadata });
                                            console.log('[Autoplay] ✅ Con metadata:', candidateMetadata.title);
                                        } else {
                                            console.log('[Autoplay] ❌ Sin metadata, descartando:', t.title);
                                        }
                                    } catch (error) {
                                        console.log('[Autoplay] ❌ Error verificando:', t.title);
                                    }

                                    if (filteredTracks.length >= 5) break;
                                }

                                if (filteredTracks.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * filteredTracks.length);
                                    const randomItem = filteredTracks[randomIndex];
                                    const randomTrack = randomItem.track;

                                    console.log('[Autoplay] Canción elegida:', randomItem.metadata.title, 'por', randomItem.metadata.artist);

                                    // Agregar a la cola y reproducir
                                    currentPlayer.queue.add(randomTrack);

                                    // Emitir evento Socket.IO al dashboard INMEDIATAMENTE
                                    if (client.io) {
                                        const playerData = {
                                            connected: true,
                                            playing: currentPlayer.playing,
                                            paused: currentPlayer.paused,
                                            current: currentPlayer.queue.current ? {
                                                title: currentPlayer.queue.current.title,
                                                author: currentPlayer.queue.current.author,
                                                duration: currentPlayer.queue.current.length,
                                                thumbnail: currentPlayer.queue.current.thumbnail
                                            } : null,
                                            queue: currentPlayer.queue.map(track => ({
                                                title: track.title,
                                                author: track.author,
                                                duration: track.length
                                            })),
                                            position: currentPlayer.position || 0,
                                            volume: currentPlayer.volume
                                        };

                                        client.io.to(`guild-${currentPlayer.guildId}`).emit('player-update', playerData);
                                    }

                                    if (!currentPlayer.playing && !currentPlayer.paused) {
                                        await currentPlayer.play();
                                    }

                                    if (channel) {
                                        await channel.send({
                                            embeds: [{
                                                color: COLORS.MUSIC,
                                                description: `🎵 **Autoplay:** Añadiendo [${randomTrack.title}](${randomTrack.uri})`
                                            }]
                                        }).catch(() => {});
                                    }

                                    autoplaySuccess = true; // Marcar que autoplay tuvo éxito
                                } else {
                                    console.log('[Autoplay] ❌ No se encontraron canciones con metadata');
                                }
                            }
                        } catch (error) {
                            console.error('[Autoplay] Error al buscar canción:', error);
                        }
                    }

                    // SOLO cerrar el player si autoplay NO tuvo éxito
                    if (autoplaySuccess) {
                        return; // No destruir el player, autoplay añadió una canción
                    }

                    // Si autoplay no está activado o falló, proceder con el cierre normal
                    const message = nowPlayingMessages.get(player.guildId);
                    if (message) {
                        // Borrar el mensaje de "now playing"
                        try {
                            await message.delete();
                        } catch (err) {
                            // Mensaje ya borrado o sin permisos
                        }
                        nowPlayingMessages.delete(player.guildId);
                    }

                    // Enviar mensaje de despedida
                    const channel = client.channels.cache.get(player.textId);
                    if (channel) {
                        await channel.send({
                            embeds: [{
                                color: COLORS.INFO,
                                description: '✈️ La cola ha terminado. ¡Hasta pronto! - Meditea DJ'
                            }]
                        }).catch(() => {});
                    }

                    // Destruir el player (desconectar del canal)
                    setTimeout(() => {
                        const finalPlayer = client.kazagumo.players.get(player.guildId);
                        if (finalPlayer) {
                            finalPlayer.destroy();
                        }
                    }, 2000);
                }
            }, 500);
        });

        // Evento cuando el player es destruido
        client.kazagumo.on('playerDestroy', async (player) => {
            const message = nowPlayingMessages.get(player.guildId);
            if (message) {
                try {
                    await message.delete();
                } catch (err) {
                    // Mensaje ya borrado
                }
                nowPlayingMessages.delete(player.guildId);
            }
        });
    }
};

function createNowPlayingEmbed(track, player) {
    const progress = player.position || 0;
    const duration = track.length;
    const progressBar = createProgressBar(progress, duration);

    // Dashboard URL
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://guillermocort.es/mediteadj';
    const dashboardLink = `${dashboardUrl}/dashboard/${player.guildId}`;

    const embed = new EmbedBuilder()
        .setColor(COLORS.MUSIC)
        .setTitle('🎵 Reproduciendo Ahora')
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
            { name: '🎤 Artista', value: track.author, inline: true },
            { name: '⏱️ Duración', value: formatTime(duration), inline: true },
            { name: '🔊 Volumen', value: `${player.volume}%`, inline: true },
            { name: '📊 Progreso', value: progressBar, inline: false },
            { name: '🌐 Dashboard', value: `[Controla desde la web](${dashboardLink})`, inline: false }
        )
        .setThumbnail(track.thumbnail || null);

    if (track.requester && track.requester.displayAvatarURL) {
        embed.setFooter({
            text: `Solicitado por ${track.requester.username || track.requester.tag}`,
            iconURL: track.requester.displayAvatarURL()
        });
    } else if (track.requester) {
        embed.setFooter({
            text: `Solicitado por ${track.requester.username || track.requester.tag || 'Autoplay'}`
        });
    }

    return embed;
}

function createProgressBar(current, total) {
    // Validar y sanitizar valores
    if (!current || current < 0) current = 0;
    if (!total || total <= 0) total = 1; // Evitar división por 0
    if (current > total) current = total; // Evitar progreso > 100%

    const percentage = (current / total) * 100;
    const filled = Math.floor(percentage / 5);

    // Asegurar que filled esté en rango válido [0, 20]
    const safeFilled = Math.max(0, Math.min(20, filled));
    const safeEmpty = Math.max(0, 20 - safeFilled);

    const bar = '▬'.repeat(safeFilled) + '🔘' + '▬'.repeat(safeEmpty);
    const currentTime = formatTime(current);
    const totalTime = formatTime(total);

    return `${currentTime} ${bar} ${totalTime}`;
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
