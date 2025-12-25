const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reanuda la reproducción pausada'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        if (!player.paused) {
            return interaction.reply({
                embeds: [MusicEmbeds.warning(
                    'No está pausado',
                    'La reproducción no está pausada actualmente.'
                )],
                flags: 64
            });
        }

        player.pause(false);

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Reanudado',
                'La reproducción ha sido reanudada.'
            )]
        });
    }
};
