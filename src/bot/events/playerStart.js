const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../config/constants');

// Map para almacenar los mensajes de "now playing" por guild
const nowPlayingMessages = new Map();

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        // Evento cuando empieza una canción
        client.kazagumo.on('playerStart', async (player, track) => {
            const channel = client.channels.cache.get(player.textId);
            if (!channel) return;

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
                    // Si el player no existe o no está reproduciendo, limpiar
                    const currentPlayer = client.kazagumo.players.get(player.guildId);
                    if (!currentPlayer || !currentPlayer.playing) {
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

                // Si no hay canción actual y la cola está vacía, desconectar
                if (!currentPlayer.queue.current && currentPlayer.queue.size === 0) {
                    const message = nowPlayingMessages.get(player.guildId);
                    if (message) {
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

    const embed = new EmbedBuilder()
        .setColor(COLORS.MUSIC)
        .setTitle('🎵 Reproduciendo Ahora')
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
            { name: '🎤 Artista', value: track.author, inline: true },
            { name: '⏱️ Duración', value: formatTime(duration), inline: true },
            { name: '🔊 Volumen', value: `${player.volume}%`, inline: true },
            { name: '📊 Progreso', value: progressBar, inline: false }
        )
        .setThumbnail(track.thumbnail || null);

    if (track.requester) {
        embed.setFooter({
            text: `Solicitado por ${track.requester.username}`,
            iconURL: track.requester.displayAvatarURL()
        });
    }

    return embed;
}

function createProgressBar(current, total) {
    const percentage = (current / total) * 100;
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;

    const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(empty);
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
