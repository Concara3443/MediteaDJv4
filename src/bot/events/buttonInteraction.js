const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const MusicEmbeds = require('../utils/embeds');
const { LIMITS } = require('../../config/constants');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Solo procesar interacciones de botones
        if (!interaction.isButton()) return;

        // Manejar botones de paginación del queue
        if (interaction.customId.startsWith('queue_')) {
            return handleQueueButtons(interaction, client);
        }

        // Solo procesar botones de música
        if (!interaction.customId.startsWith('music_')) return;

        const player = client.kazagumo.players.get(interaction.guild.id);

        // Verificar que el usuario esté en un canal de voz
        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ Debes estar en un canal de voz para usar los controles.',
                ephemeral: true
            });
        }

        // Verificar que el player existe
        if (!player) {
            return interaction.reply({
                content: '❌ No hay ninguna canción reproduciéndose.',
                ephemeral: true
            });
        }

        // Verificar que el usuario está en el mismo canal que el bot
        const botChannel = interaction.guild.members.me.voice.channel;
        if (botChannel && member.voice.channel.id !== botChannel.id) {
            return interaction.reply({
                content: '❌ Debes estar en el mismo canal de voz que el bot.',
                ephemeral: true
            });
        }

        try {
            switch (interaction.customId) {
                case 'music_pause':
                    player.pause(true);
                    await interaction.reply({
                        content: '⏸️ Música pausada',
                        ephemeral: true
                    });
                    break;

                case 'music_resume':
                    player.pause(false);
                    await interaction.reply({
                        content: '▶️ Música reanudada',
                        ephemeral: true
                    });
                    break;

                case 'music_skip':
                    if (player.queue.length === 0) {
                        await interaction.reply({
                            content: '❌ No hay más canciones en la cola',
                            ephemeral: true
                        });
                        return;
                    }
                    player.skip();
                    await interaction.reply({
                        content: '⏭️ Canción saltada',
                        ephemeral: true
                    });
                    break;

                case 'music_stop':
                    player.queue.clear();
                    player.destroy();
                    await interaction.reply({
                        content: '⏹️ Reproducción detenida y cola limpiada',
                        ephemeral: true
                    });
                    break;

                case 'music_previous':
                    // Por ahora deshabilitado
                    await interaction.reply({
                        content: '⚠️ Función no disponible aún',
                        ephemeral: true
                    });
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Botón desconocido',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('[ButtonInteraction] Error:', error);
            await interaction.reply({
                content: '❌ Ocurrió un error al ejecutar esta acción',
                ephemeral: true
            }).catch(() => {});
        }
    }
};

async function handleQueueButtons(interaction, client) {
    const player = client.kazagumo.players.get(interaction.guild.id);

    if (!player || !player.queue.current) {
        return interaction.reply({
            content: '❌ No hay ninguna canción reproduciéndose.',
            ephemeral: true
        });
    }

    const customId = interaction.customId;
    const currentPage = parseInt(customId.split('_')[2]) || 1;
    const totalPages = Math.ceil(player.queue.size / LIMITS.QUEUE_PAGE_SIZE) || 1;

    let newPage = currentPage;

    if (customId.startsWith('queue_prev_')) {
        newPage = Math.max(1, currentPage - 1);
    } else if (customId.startsWith('queue_next_')) {
        newPage = Math.min(totalPages, currentPage + 1);
    } else {
        return;
    }

    // Recalcular totalPages por si la cola cambió
    const updatedTotalPages = Math.ceil(player.queue.size / LIMITS.QUEUE_PAGE_SIZE) || 1;
    newPage = Math.min(newPage, updatedTotalPages);

    const queueEmbed = MusicEmbeds.queue(player, newPage, LIMITS.QUEUE_PAGE_SIZE);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`queue_prev_${newPage}`)
                .setLabel('◀ Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(newPage === 1),
            new ButtonBuilder()
                .setCustomId(`queue_page_${newPage}`)
                .setLabel(`Página ${newPage}/${updatedTotalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`queue_next_${newPage}`)
                .setLabel('Siguiente ▶')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(newPage === updatedTotalPages)
        );

    try {
        await interaction.update({
            embeds: [queueEmbed],
            components: updatedTotalPages > 1 ? [row] : []
        });
    } catch (error) {
        console.error('[QueueButtons] Error:', error);
    }
}
