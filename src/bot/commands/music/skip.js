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

        // Intentar saltar
        player.skip();

        // Verificar si hay más canciones en la cola
        if (player.queue.size === 0) {
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
