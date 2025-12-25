const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { LOOP_MODES } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Cambia el modo de repetición')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Modo de repetición')
                .setRequired(true)
                .addChoices(
                    { name: 'Desactivar', value: LOOP_MODES.NONE },
                    { name: 'Repetir canción actual', value: LOOP_MODES.TRACK },
                    { name: 'Repetir toda la cola', value: LOOP_MODES.QUEUE }
                )
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const mode = interaction.options.getString('mode');

        // Configurar el modo de loop
        player.setLoop(mode);

        const modeNames = {
            [LOOP_MODES.NONE]: 'Desactivado',
            [LOOP_MODES.TRACK]: 'Repetir canción actual',
            [LOOP_MODES.QUEUE]: 'Repetir toda la cola'
        };

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Modo de repetición cambiado',
                `El modo de repetición ahora está: **${modeNames[mode]}**`
            )]
        });
    }
};
