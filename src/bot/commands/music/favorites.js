const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('favorites')
        .setDescription('Gestiona tus canciones favoritas')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade la canción actual a favoritos')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Muestra tu lista de favoritos')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Página a mostrar')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Reproduce una canción de tus favoritos')
                .addStringOption(option =>
                    option
                        .setName('search')
                        .setDescription('Busca por título o artista')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina una canción de favoritos')
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('Número de la canción en la lista')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const userModel = client.db.models.User;

        try {
            switch (subcommand) {
                case 'add':
                    await handleAdd(interaction, client, userModel);
                    break;
                case 'list':
                    await handleList(interaction, client, userModel);
                    break;
                case 'play':
                    await handlePlay(interaction, client, userModel);
                    break;
                case 'remove':
                    await handleRemove(interaction, client, userModel);
                    break;
            }
        } catch (error) {
            console.error('[Favorites] Error:', error);
            await interaction.reply({
                content: 'Hubo un error al procesar tu solicitud.',
                ephemeral: true
            });
        }
    }
};

async function handleAdd(interaction, client, userModel) {
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
        return interaction.reply({
            content: '❌ No hay ninguna canción reproduciéndose.',
            ephemeral: true
        });
    }

    const track = player.queue.current;

    try {
        await userModel.addFavorite(interaction.user.id, {
            title: track.title,
            author: track.author,
            uri: track.uri,
            thumbnail: track.thumbnail,
            duration: track.length
        });

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS || COLORS.MUSIC)
            .setTitle('⭐ Añadido a Favoritos')
            .setDescription(`**${track.title}**\n${track.author}`)
            .setThumbnail(track.thumbnail);

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
            return interaction.reply({
                content: '⚠️ Esta canción ya está en tus favoritos.',
                ephemeral: true
            });
        }
        throw error;
    }
}

async function handleList(interaction, client, userModel) {
    const page = interaction.options.getInteger('page') || 1;
    const pageSize = 10;

    const favorites = await userModel.getFavorites(interaction.user.id, 100);

    if (favorites.length === 0) {
        return interaction.reply({
            content: '📭 No tienes canciones favoritas. Usa `/favorites add` para añadir.',
            ephemeral: true
        });
    }

    const totalPages = Math.ceil(favorites.length / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageFavorites = favorites.slice(start, end);

    const description = pageFavorites
        .map((fav, idx) => `**${start + idx + 1}.** ${fav.track_title} - ${fav.track_author}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(COLORS.MUSIC)
        .setTitle('⭐ Tus Canciones Favoritas')
        .setDescription(description)
        .setFooter({ text: `Página ${page}/${totalPages} • Total: ${favorites.length} canciones` });

    await interaction.reply({ embeds: [embed] });
}

async function handlePlay(interaction, client, userModel) {
    const search = interaction.options.getString('search').toLowerCase();
    const favorites = await userModel.getFavorites(interaction.user.id);

    if (favorites.length === 0) {
        return interaction.reply({
            content: '📭 No tienes canciones favoritas.',
            ephemeral: true
        });
    }

    const match = favorites.find(fav =>
        fav.track_title.toLowerCase().includes(search) ||
        fav.track_author.toLowerCase().includes(search)
    );

    if (!match) {
        return interaction.reply({
            content: `❌ No se encontró "${search}" en tus favoritos.`,
            ephemeral: true
        });
    }

    // Get or create player
    const { channel } = interaction.member.voice;

    if (!channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz.',
            ephemeral: true
        });
    }

    let player = client.kazagumo.players.get(interaction.guildId);

    if (!player) {
        player = await client.kazagumo.createPlayer({
            guildId: interaction.guildId,
            textId: interaction.channelId,
            voiceId: channel.id,
            deaf: true
        });
    }

    // Search and play
    const result = await client.kazagumo.search(match.track_uri, { requester: interaction.user });

    if (!result || !result.tracks.length) {
        return interaction.reply({
            content: '❌ No se pudo reproducir la canción.',
            ephemeral: true
        });
    }

    player.queue.add(result.tracks[0]);

    if (!player.playing && !player.paused) {
        await player.play();
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.MUSIC)
        .setTitle('⭐ Reproduciendo Favorito')
        .setDescription(`**${match.track_title}**\n${match.track_author}`)
        .setThumbnail(match.track_thumbnail);

    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, client, userModel) {
    const number = interaction.options.getInteger('number');
    const favorites = await userModel.getFavorites(interaction.user.id);

    if (favorites.length === 0) {
        return interaction.reply({
            content: '📭 No tienes canciones favoritas.',
            ephemeral: true
        });
    }

    if (number > favorites.length) {
        return interaction.reply({
            content: `❌ Solo tienes ${favorites.length} favoritos.`,
            ephemeral: true
        });
    }

    const favorite = favorites[number - 1];
    await userModel.removeFavorite(interaction.user.id, favorite.track_uri);

    const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING || COLORS.MUSIC)
        .setTitle('🗑️ Eliminado de Favoritos')
        .setDescription(`**${favorite.track_title}**\n${favorite.track_author}`);

    await interaction.reply({ embeds: [embed] });
}
