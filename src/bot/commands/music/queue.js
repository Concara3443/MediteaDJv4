const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { LIMITS } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de reproducción actual')
        .addIntegerOption(option =>
            option
                .setName('page')
                .setDescription('Número de página a mostrar')
                .setMinValue(1)
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const page = interaction.options.getInteger('page') || 1;
        const totalPages = Math.ceil(player.queue.size / LIMITS.QUEUE_PAGE_SIZE) || 1;

        if (page > totalPages) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Página inválida',
                    `Solo hay ${totalPages} página(s) en la cola.`
                )],
                flags: 64
            });
        }

        const queueEmbed = MusicEmbeds.queue(player, page, LIMITS.QUEUE_PAGE_SIZE);

        // Crear botones de navegación si hay múltiples páginas
        if (totalPages > 1) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`queue_prev_${page}`)
                        .setLabel('◀ Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId(`queue_page_${page}`)
                        .setLabel(`Página ${page}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`queue_next_${page}`)
                        .setLabel('Siguiente ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages)
                );

            return interaction.reply({
                embeds: [queueEmbed],
                components: [row]
            });
        }

        return interaction.reply({
            embeds: [queueEmbed]
        });
    }
};
