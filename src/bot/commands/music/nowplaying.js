const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra la canción que se está reproduciendo actualmente'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const nowPlayingEmbed = MusicEmbeds.trackProgress(player);

        return interaction.reply({
            embeds: [nowPlayingEmbed]
        });
    }
};
