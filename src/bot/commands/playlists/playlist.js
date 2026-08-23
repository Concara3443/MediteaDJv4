const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicEmbeds = require('../../utils/embeds');
const PermissionChecker = require('../../utils/permissions');
const { COLORS, EMOJIS, LIMITS } = require('../../../config/constants');
const { formatTime } = require('../../utils/formatTime');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Gestiona tus playlists guardadas')
        .addSubcommand(subcommand =>
            subcommand
                .setName('save')
                .setDescription('Guarda la cola actual como playlist')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nombre de la playlist')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setDescription('Carga una playlist guardada')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nombre de la playlist')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Elimina una playlist guardada')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nombre de la playlist')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todas tus playlists en este servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Muestra información sobre una playlist')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nombre de la playlist')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const playlistModel = global.dbManager.models.Playlist;
        const playlists = playlistModel.getUserPlaylists(interaction.user.id, interaction.guild.id);

        const filtered = playlists
            .filter(p => p.name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25)
            .map(p => ({ name: `${p.name} (${p.trackCount} canciones)`, value: p.name }));

        await interaction.respond(filtered);
    },

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const playlistModel = global.dbManager.models.Playlist;

        switch (subcommand) {
            case 'save':
                await this.handleSave(interaction, client, playlistModel);
                break;
            case 'load':
                await this.handleLoad(interaction, client, playlistModel);
                break;
            case 'delete':
                await this.handleDelete(interaction, playlistModel);
                break;
            case 'list':
                await this.handleList(interaction, playlistModel);
                break;
            case 'info':
                await this.handleInfo(interaction, playlistModel);
                break;
        }
    },

    async handleSave(interaction, client, playlistModel) {
        const check = await PermissionChecker.checkMusicPermissions(interaction, client, true);
        if (!check.success) return;

        const { player } = check;

        if (!PermissionChecker.isPlaying(interaction, player)) {
            return;
        }

        const name = interaction.options.getString('name');

        // Preparar tracks para guardar
        const tracks = [];

        // Añadir canción actual
        if (player.queue.current) {
            tracks.push({
                title: player.queue.current.title,
                author: player.queue.current.author,
                uri: player.queue.current.uri,
                length: player.queue.current.length,
                thumbnail: player.queue.current.thumbnail
            });
        }

        // Añadir el resto de la cola
        player.queue.forEach(track => {
            tracks.push({
                title: track.title,
                author: track.author,
                uri: track.uri,
                length: track.length,
                thumbnail: track.thumbnail
            });
        });

        if (tracks.length === 0) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Cola vacía',
                    'No hay canciones para guardar.'
                )],
                flags: 64
            });
        }

        if (tracks.length > LIMITS.PLAYLIST_SIZE) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Playlist muy grande',
                    `Solo puedes guardar hasta ${LIMITS.PLAYLIST_SIZE} canciones por playlist. Actualmente tienes ${tracks.length}.`
                )],
                flags: 64
            });
        }

        // Guardar en la base de datos
        const result = await playlistModel.create(interaction.user.id, interaction.guild.id, name, tracks);

        if (!result.success) {
            return interaction.reply({
                embeds: [MusicEmbeds.error('Error al guardar', result.error)],
                flags: 64
            });
        }

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Playlist guardada',
                `Se guardó la playlist **${name}** con ${tracks.length} canción(es).`
            )]
        });
    },

    async handleLoad(interaction, client, playlistModel) {
        await interaction.deferReply();

        const check = await PermissionChecker.checkMusicPermissions(interaction, client, false);
        if (!check.success) return;

        const { player: existingPlayer, voiceChannel } = check;
        const name = interaction.options.getString('name');

        // Obtener playlist de la base de datos
        const playlist = playlistModel.getPlaylist(interaction.user.id, interaction.guild.id, name);

        if (!playlist) {
            return interaction.editReply({
                embeds: [MusicEmbeds.error(
                    'Playlist no encontrada',
                    `No tienes ninguna playlist llamada **${name}** en este servidor.`
                )]
            });
        }

        // Obtener o crear player
        let player = existingPlayer || client.kazagumo.createPlayer({
            guildId: interaction.guild.id,
            textId: interaction.channel.id,
            voiceId: voiceChannel.id,
            volume: LIMITS.VOLUME_DEFAULT,
            deaf: true
        });

        if (!player.connected) {
            player.connect();
        }

        // Cargar canciones
        let loaded = 0;
        let failed = 0;

        for (const trackData of playlist.tracks) {
            try {
                const result = await client.kazagumo.search(trackData.uri, { requester: interaction.user });

                if (result && result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    loaded++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
                console.error('[Playlist Load] Error al cargar canción:', error);
            }
        }

        if (!player.playing && !player.paused && loaded > 0) {
            player.play();
        }

        let description = `Se cargaron **${loaded}** canción(es) de la playlist **${name}**`;
        if (failed > 0) {
            description += `\n⚠️ ${failed} canción(es) no pudieron ser cargadas`;
        }

        return interaction.editReply({
            embeds: [MusicEmbeds.success('Playlist cargada', description)]
        });
    },

    async handleDelete(interaction, playlistModel) {
        const name = interaction.options.getString('name');

        const deleted = playlistModel.delete(interaction.user.id, interaction.guild.id, name);

        if (!deleted) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Playlist no encontrada',
                    `No tienes ninguna playlist llamada **${name}** en este servidor.`
                )],
                flags: 64
            });
        }

        return interaction.reply({
            embeds: [MusicEmbeds.success(
                'Playlist eliminada',
                `Se eliminó la playlist **${name}** correctamente.`
            )]
        });
    },

    async handleList(interaction, playlistModel) {
        const playlists = playlistModel.getUserPlaylists(interaction.user.id, interaction.guild.id);

        if (playlists.length === 0) {
            return interaction.reply({
                embeds: [MusicEmbeds.warning(
                    'Sin playlists',
                    'No tienes playlists guardadas en este servidor.\nUsa `/playlist save <nombre>` para guardar tu cola actual.'
                )],
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setTitle(`${EMOJIS.PLAYLIST} Tus Playlists`)
            .setDescription(
                playlists.map((p, i) =>
                    `**${i + 1}.** ${p.name} - ${p.trackCount} canción(es)`
                ).join('\n')
            )
            .setFooter({ text: `Total: ${playlists.length} playlist(s)` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },

    async handleInfo(interaction, playlistModel) {
        const name = interaction.options.getString('name');

        const playlist = playlistModel.getPlaylist(interaction.user.id, interaction.guild.id, name);

        if (!playlist) {
            return interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Playlist no encontrada',
                    `No tienes ninguna playlist llamada **${name}** en este servidor.`
                )],
                flags: 64
            });
        }

        const totalDuration = playlist.tracks.reduce((acc, track) => acc + track.length, 0);
        const trackList = playlist.tracks
            .slice(0, 10)
            .map((track, i) => `\`${i + 1}.\` ${track.title} - ${formatTime(track.length)}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setTitle(`${EMOJIS.PLAYLIST} ${playlist.name}`)
            .setDescription(trackList)
            .addFields(
                { name: 'Canciones', value: String(playlist.tracks.length), inline: true },
                { name: 'Duración total', value: formatTime(totalDuration), inline: true },
                { name: 'Creada', value: new Date(playlist.created_at).toLocaleDateString(), inline: true }
            )
            .setFooter({ text: playlist.tracks.length > 10 ? `Mostrando 10 de ${playlist.tracks.length} canciones` : '' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
