const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { LIMITS } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce una canción o playlist')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Nombre de la canción o URL (YouTube, Spotify, SoundCloud)')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        // Verificar permisos ANTES de diferir (para evitar errores de interacción)
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, false);
        if (!check.success) return;

        // Diferir la respuesta ya que la búsqueda puede tardar
        await interaction.deferReply();

        const { player: existingPlayer, voiceChannel } = check;
        const query = interaction.options.getString('query');

        try {
            // Buscar la canción/playlist
            const result = await client.kazagumo.search(query, { requester: interaction.user });

            if (!result || !result.tracks.length) {
                return interaction.editReply({
                    embeds: [MusicEmbeds.error(
                        'No se encontraron resultados',
                        `No pude encontrar ninguna canción con: \`${query}\``
                    )]
                });
            }

            // Obtener o crear player
            let player = existingPlayer || await client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: LIMITS.VOLUME_DEFAULT,
                deaf: true
            });

            // Manejar playlists
            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    player.queue.add(track);
                }

                if (!player.playing && !player.paused) {
                    player.play();
                }

                return interaction.editReply({
                    embeds: [MusicEmbeds.success(
                        'Playlist añadida',
                        `Se añadieron **${result.tracks.length}** canciones de la playlist **${result.playlistName}**`
                    )]
                });
            }

            // Manejar canción individual
            const track = result.tracks[0];

            // Verificar límite de cola
            const queueSize = player.queue?.length || 0;
            if (queueSize >= LIMITS.QUEUE_SIZE) {
                return interaction.editReply({
                    embeds: [MusicEmbeds.error(
                        'Cola llena',
                        `La cola ha alcanzado el límite máximo de **${LIMITS.QUEUE_SIZE}** canciones.`
                    )]
                });
            }

            player.queue.add(track);

            if (!player.playing && !player.paused) {
                // Si no hay nada reproduciéndose, empezar a reproducir
                player.play();
                return interaction.editReply({
                    embeds: [MusicEmbeds.nowPlaying(track, interaction.user)]
                });
            } else {
                // Si ya hay algo reproduciéndose, mostrar que se añadió a la cola
                return interaction.editReply({
                    embeds: [MusicEmbeds.trackAdded(track, interaction.user)]
                });
            }

        } catch (error) {
            console.error('[Play Command] Error:', error);
            return interaction.editReply({
                embeds: [MusicEmbeds.error(
                    'Error al reproducir',
                    'Ocurrió un error al intentar reproducir la canción. Inténtalo de nuevo.'
                )]
            });
        }
    }
};
