const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Mezcla aleatoriamente la cola de reproducción'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.hasQueue(interaction, player)) {
            return;
        }

        if (player.queue.size < 2) {
            return interaction.reply({
                embeds: [MusicEmbeds.warning(
                    'Cola muy pequeña',
                    'Necesitas al menos 2 canciones en la cola para mezclar.'
                )],
                flags: 64
            });
        }

        // Algoritmo Fisher-Yates para mezclar
        const queue = player.queue;
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Cola mezclada',
                `Se mezclaron **${player.queue.size}** canciones aleatoriamente.`
            )]
        });
    }
};
