const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa la reproducción actual'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        if (player.paused) {
            return interaction.reply({
                embeds: [MusicEmbeds.warning(
                    'Ya está pausado',
                    'La reproducción ya está pausada. Usa `/resume` para continuar.'
                )],
                flags: 64
            });
        }

        player.pause(true);

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Pausado',
                'La reproducción ha sido pausada. Usa `/resume` para continuar.'
            )]
        });
    }
};
