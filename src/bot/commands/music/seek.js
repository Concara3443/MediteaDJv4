const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { formatTime } = require('../../utils/formatTime');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Ir a una posición específica en la canción')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('Tiempo (formato: MM:SS o segundos)')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const track = player.queue.current;
        const timeString = interaction.options.getString('time');

        // Convertir el tiempo a milisegundos
        let seekMs;

        if (timeString.includes(':')) {
            // Formato MM:SS
            const parts = timeString.split(':');
            if (parts.length !== 2) {
                return interaction.reply({
                    embeds: [MusicEmbeds.error(
                        'Formato inválido',
                        'Usa el formato MM:SS (ejemplo: 1:30) o segundos (ejemplo: 90)'
                    )],
                    flags: 64
                });
            }

            const minutes = parseInt(parts[0]);
            const seconds = parseInt(parts[1]);

            if (isNaN(minutes) || isNaN(seconds)) {
                return interaction.reply({
                    embeds: [MusicEmbeds.error(
                        'Tiempo inválido',
                        'Los valores deben ser números válidos'
                    )],
                    flags: 64
                });
            }

            seekMs = (minutes * 60 + seconds) * 1000;
        } else {
            // Formato en segundos
            const seconds = parseInt(timeString);
            if (isNaN(seconds)) {
                return interaction.reply({
                    embeds: [MusicEmbeds.error(
                        'Tiempo inválido',
                        'Debes proporcionar un número válido de segundos'
                    )],
                    flags: 64
                });
            }

            seekMs = seconds * 1000;
        }

        // Verificar que el tiempo no exceda la duración de la canción
        if (seekMs < 0 || seekMs > track.length) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Tiempo fuera de rango',
                    `La canción dura ${formatTime(track.length)}. El tiempo debe estar entre 0 y ${formatTime(track.length)}.`
                )],
                flags: 64
            });
        }

        // Verificar si la canción es seekable
        if (!track.isSeekable) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No se puede buscar',
                    'Esta canción no permite buscar posiciones específicas.'
                )],
                flags: 64
            });
        }

        // Hacer el seek
        player.seek(seekMs);

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Posición cambiada',
                `La canción ahora está en ${formatTime(seekMs)}`
            )]
        });
    }
};
