const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la reproducción y limpia la cola'),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const tracksCleared = player.queue.size;

        // Limpiar la cola y destruir el player
        player.queue.clear();
        player.destroy();

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Detenido',
                `Reproducción detenida y **${tracksCleared}** canción(es) eliminada(s) de la cola.`
            )]
        });
    }
};
