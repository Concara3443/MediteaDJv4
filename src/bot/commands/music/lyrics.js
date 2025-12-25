const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client } = require('genius-lyrics');
const { COLORS } = require('../../../config/constants');

// Inicializar cliente de Genius con Access Token
const genius = new Client(process.env.GENIUS_ACCESS_TOKEN);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Muestra la letra de la canción actual o busca una específica')
        .addStringOption(option =>
            option
                .setName('cancion')
                .setDescription('Nombre de la canción (opcional, usa la actual si no se especifica)')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            let searchQuery;
            let trackTitle = '';

            // Si no se proporcionó canción, usar la actual
            if (!interaction.options.getString('cancion')) {
                const player = client.kazagumo.players.get(interaction.guild.id);

                if (!player || !player.queue.current) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setDescription('❌ No hay ninguna canción reproduciéndose actualmente.\nUsa `/lyrics <canción>` para buscar una específica.')
                        ]
                    });
                }

                trackTitle = player.queue.current.title;

                // Limpiar el título de la canción
                searchQuery = cleanSearchQuery(`${player.queue.current.author} ${trackTitle}`);
            } else {
                searchQuery = cleanSearchQuery(interaction.options.getString('cancion'));
            }

            // Buscar la canción en Genius
            const searches = await genius.songs.search(searchQuery);

            if (!searches || searches.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle('🔍 No se encontraron letras')
                        .setDescription(`No pude encontrar la letra de: **${searchQuery}**\n\nIntenta buscar con el nombre exacto de la canción y artista.`)
                    ]
                });
            }

            // Filtrar resultados para evitar discografías, álbumes, listas, etc.
            const filteredResults = searches.filter(song => {
                const title = song.title.toLowerCase();
                return !title.includes('discografía') &&
                       !title.includes('discography') &&
                       !title.includes('tracklist') &&
                       !title.includes('album') &&
                       !title.includes(' em ') &&  // "2020 em 2020" y similares
                       !title.includes(' in ') &&  // "Albums in 2020"
                       !title.match(/^\d{4}/) &&   // Títulos que empiezan con año
                       !title.includes('list') &&
                       !title.includes('collection');
            });

            if (filteredResults.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle('🔍 No se encontraron letras válidas')
                        .setDescription(`No pude encontrar una canción válida para: **${searchQuery}**`)
                    ]
                });
            }

            // Obtener la primera canción válida
            const song = filteredResults[0];

            // Obtener las letras
            let lyrics = await song.lyrics();

            if (!lyrics || lyrics.trim().length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.WARNING)
                        .setTitle('🔍 No se encontraron letras')
                        .setDescription(`Encontré la canción **${song.title}** por **${song.artist.name}**, pero no tiene letras disponibles.`)
                    ]
                });
            }

            // Limpiar las letras de metadata de Genius
            lyrics = cleanLyrics(lyrics);

            // Dividir letras en páginas si es necesario
            const pages = paginateLyrics(lyrics, song, 2000);

            if (pages.length === 1) {
                // Una sola página, enviar sin botones
                return interaction.editReply({ embeds: [pages[0]] });
            }

            // Múltiples páginas, enviar con botones de navegación
            let currentPage = 0;

            const getButtons = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('lyrics_prev')
                            .setEmoji('⬅️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('lyrics_page')
                            .setLabel(`Página ${page + 1}/${pages.length}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('lyrics_next')
                            .setEmoji('➡️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === pages.length - 1)
                    );
            };

            const message = await interaction.editReply({
                embeds: [pages[currentPage]],
                components: [getButtons(currentPage)]
            });

            // Collector para los botones
            const collector = message.createMessageComponentCollector({
                time: 300000 // 5 minutos
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '❌ Solo quien usó el comando puede cambiar de página.',
                        ephemeral: true
                    });
                }

                if (i.customId === 'lyrics_prev') {
                    currentPage--;
                } else if (i.customId === 'lyrics_next') {
                    currentPage++;
                }

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [getButtons(currentPage)]
                });
            });

            collector.on('end', () => {
                message.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('[Lyrics] Error:', error);

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('❌ Error al buscar letras')
                    .setDescription('Ocurrió un error al buscar la letra. Inténtalo de nuevo o verifica que el nombre de la canción sea correcto.')
                ]
            });
        }
    }
};

/**
 * Limpia el query de búsqueda removiendo texto innecesario
 */
function cleanSearchQuery(query) {
    return query
        .replace(/\(official\s*(video|audio|music\s*video|lyric\s*video)?\)/gi, '')
        .replace(/\[official\s*(video|audio|music\s*video|lyric\s*video)?\]/gi, '')
        .replace(/-\s*(official\s*)?(video|audio|music\s*video|lyric\s*video)/gi, '')
        .replace(/\s*-\s*topic$/gi, '')
        .replace(/\s*\(\s*\)/g, '')
        .replace(/\s*\[\s*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Limpia las letras removiendo metadata de Genius
 */
function cleanLyrics(lyrics) {
    // Remover patrones como "20 Contributors" o "Contributors"
    lyrics = lyrics.replace(/^\d+\s+contributors?.*$/gmi, '');

    // Remover "Translations" y traducciones
    lyrics = lyrics.replace(/^translations.*$/gmi, '');
    lyrics = lyrics.replace(/^(english|español|deutsch|français|italiano|português).*$/gmi, '');

    // Remover descripción inicial (todo antes de "[" si hay corchetes)
    if (lyrics.includes('[')) {
        const firstBracket = lyrics.indexOf('[');
        const textBefore = lyrics.substring(0, firstBracket);

        // Si hay mucho texto antes del primer corchete, probablemente sea descripción
        if (textBefore.length > 100) {
            lyrics = lyrics.substring(firstBracket);
        }
    }

    // Remover "Read More" y texto después
    lyrics = lyrics.replace(/…\s*read more.*$/gmi, '');

    // Remover URLs e imágenes de Genius
    lyrics = lyrics.replace(/<img[^>]*>/gi, '');
    lyrics = lyrics.replace(/https?:\/\/[^\s]+/gi, '');

    // Limpiar espacios múltiples y líneas vacías excesivas
    lyrics = lyrics.replace(/\n{3,}/g, '\n\n');
    lyrics = lyrics.trim();

    return lyrics;
}

/**
 * Divide las letras en páginas para Discord
 */
function paginateLyrics(lyrics, song, maxLength = 2000) {
    const pages = [];
    const lines = lyrics.split('\n');
    let currentPage = '';

    for (const line of lines) {
        // Si agregar esta línea excede el límite
        if ((currentPage + line + '\n').length > maxLength) {
            // Guardar la página actual
            if (currentPage.trim()) {
                pages.push(createLyricsEmbed(currentPage.trim(), song, pages.length + 1));
            }
            // Empezar nueva página
            currentPage = line + '\n';
        } else {
            currentPage += line + '\n';
        }
    }

    // Agregar la última página
    if (currentPage.trim()) {
        pages.push(createLyricsEmbed(currentPage.trim(), song, pages.length + 1));
    }

    return pages;
}

/**
 * Crea un embed para las letras
 */
function createLyricsEmbed(lyricsText, song, pageNumber) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`🎵 ${song.title}`)
        .setURL(song.url)
        .setDescription(lyricsText)
        .setFooter({
            text: `Letras por ${song.artist.name} • Powered by Genius`,
            iconURL: song.artist.thumbnail || undefined
        })
        .setThumbnail(song.thumbnail || song.image || null)
        .setTimestamp();

    return embed;
}
