const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { LIMITS, EMOJIS } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajusta el volumen de la reproducción')
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('Nivel de volumen (0-100)')
                .setMinValue(LIMITS.VOLUME_MIN)
                .setMaxValue(LIMITS.VOLUME_MAX)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const volume = interaction.options.getInteger('level');

        // Establecer el volumen
        player.setVolume(volume);

        // Determinar emoji basado en el nivel
        let volumeEmoji = EMOJIS.VOLUME;
        if (volume === 0) volumeEmoji = '🔇';
        else if (volume < 33) volumeEmoji = '🔈';
        else if (volume < 66) volumeEmoji = '🔉';

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Volumen ajustado',
                `${volumeEmoji} El volumen ahora está en **${volume}%**`
            )]
        });
    }
};
