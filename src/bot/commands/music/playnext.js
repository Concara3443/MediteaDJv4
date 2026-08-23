const { SlashCommandBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { LIMITS } = require('../../../config/constants');
const { getYouTubeMetadata } = require('../../utils/youtubeMetadata');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playnext')
        .setDescription('Añade una canción para reproducir después de la actual')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Nombre de la canción o URL (YouTube, Spotify, SoundCloud)')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        await interaction.deferReply();

        const { player } = check;
        const query = interaction.options.getString('query');

        try {
            const result = await client.kazagumo.search(query, { requester: interaction.user });

            if (!result || !result.tracks.length) {
                return PermissionChecker.sendError(
                    interaction,
                    'No se encontraron resultados',
                    `No pude encontrar ninguna canción con: \`${query}\``
                );
            }

            // Manejar playlists - añadir al principio de la cola
            if (result.type === 'PLAYLIST') {
                // Añadir en orden inverso para mantener el orden de la playlist
                for (let i = result.tracks.length - 1; i >= 0; i--) {
                    result.tracks[i].originalQuery = query;
                    player.queue.unshift(result.tracks[i]);
                }

                return interaction.editReply({
                    embeds: [MusicEmbeds.success(
                        'Playlist añadida (siguiente)',
                        `Se añadieron **${result.tracks.length}** canciones de **${result.playlistName}** para reproducir a continuación`
                    )]
                });
            }

            // Manejar canción individual
            let track = result.tracks[0];

            console.log('[PlayNext] Buscando canción con metadata...');
            for (const candidateTrack of result.tracks.slice(0, 5)) {
                if (candidateTrack.uri && candidateTrack.uri.includes('youtube.com')) {
                    try {
                        const metadata = await getYouTubeMetadata(candidateTrack.uri, candidateTrack.author, candidateTrack.title);
                        if (metadata && metadata.hasMetadata) {
                            track = candidateTrack;
                            console.log('[PlayNext] ✅ Priorizando canción con metadata:', metadata.title);
                            break;
                        }
                    } catch (error) {
                        console.log('[PlayNext] Error verificando metadata:', error.message);
                    }
                }
            }

            track.originalQuery = query;

            const queueSize = player.queue?.length || 0;
            if (queueSize >= LIMITS.QUEUE_SIZE) {
                return PermissionChecker.sendError(
                    interaction,
                    'Cola llena',
                    `La cola ha alcanzado el límite máximo de **${LIMITS.QUEUE_SIZE}** canciones.`
                );
            }

            // Añadir en posición 0 (después de la canción actual)
            player.queue.unshift(track);

            return interaction.editReply({
                embeds: [MusicEmbeds.success(
                    'Canción añadida (siguiente)',
                    `**[${track.title}](${track.uri})** se reproducirá a continuación`
                )]
            });

        } catch (error) {
            console.error('[PlayNext Command] Error:', error);
            return PermissionChecker.sendError(
                interaction,
                'Error al añadir',
                'Ocurrió un error al intentar añadir la canción. Inténtalo de nuevo.'
            );
        }
    }
};
