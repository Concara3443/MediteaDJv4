const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Elimina una canción de la cola')
        .addIntegerOption(option =>
            option
                .setName('position')
                .setDescription('Posición de la canción en la cola (1 = primera en cola)')
                .setMinValue(1)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.hasQueue(interaction, player)) {
            return;
        }

        const position = interaction.options.getInteger('position');

        // Verificar que la posición es válida
        if (position > player.queue.size) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Posición inválida',
                    `Solo hay **${player.queue.size}** canción(es) en la cola.`
                )],
                flags: 64
            });
        }

        // Remover la canción (position - 1 porque el array empieza en 0)
        const removed = player.queue[position - 1];
        player.queue.splice(position - 1, 1);

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Canción eliminada',
                `Se eliminó **${removed.title}** de la posición ${position}.`
            )]
        });
    }
};
