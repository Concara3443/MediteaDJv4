const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client } = require('genius-lyrics');
const { COLORS } = require('../../../config/constants');
const { getYouTubeMetadata } = require('../../utils/youtubeMetadata');
const { searchMusicBrainz } = require('../../utils/musicbrainz');

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

                const currentTrack = player.queue.current;

                // LOG: Información de la canción actual
                console.log('[Lyrics] ========== BÚSQUEDA DE LETRA ==========');

                // Obtener metadata limpia (Spotify + MusicBrainz)
                let metadata = await getYouTubeMetadata(currentTrack.uri, currentTrack.author, currentTrack.title);

                // Si no encontró con el método normal, intentar MusicBrainz directamente
                if (!metadata || !metadata.hasMetadata) {
                    console.log('[Lyrics] Intentando MusicBrainz directamente...');
                    const mbMetadata = await searchMusicBrainz(currentTrack.author, currentTrack.title);
                    if (mbMetadata) {
                        metadata = {
                            title: mbMetadata.title,
                            artist: mbMetadata.artist,
                            hasMetadata: true,
                            source: 'musicbrainz'
                        };
                    }
                }

                // Si aún no hay metadata, usar el título y autor originales (limpios)
                if (!metadata || !metadata.hasMetadata) {
                    console.log('[Lyrics] ⚠️ Sin metadata, usando título/autor originales limpiados');
                    // Limpiar título y autor para búsqueda
                    const cleanedTitle = cleanSearchQuery(currentTrack.title);
                    const cleanedArtist = currentTrack.author.replace(/\s*-\s*topic$/i, '').trim();

                    metadata = {
                        title: cleanedTitle,
                        artist: cleanedArtist,
                        hasMetadata: false,
                        source: 'original-cleaned'
                    };
                }

                // Usar metadata obtenida
                const searchArtist = metadata.artist;
                const searchTitle = metadata.title;
                console.log(`[Lyrics] ✅ Usando metadata (${metadata.source}):`, { searchArtist, searchTitle });

                searchQuery = `${searchArtist} ${searchTitle}`;
                trackTitle = currentTrack.title; // Para el embed
            } else {
                searchQuery = cleanSearchQuery(interaction.options.getString('cancion'));
            }

            // Buscar la canción en Genius
            const searches = await genius.songs.search(searchQuery);

            console.log('[Lyrics] Resultados encontrados:', searches.length);
            if (searches.length > 0) {
                console.log('[Lyrics] Primeros 3 resultados:');
                searches.slice(0, 3).forEach((song, i) => {
                    console.log(`[Lyrics]   ${i + 1}. "${song.title}" - ${song.artist.name}`);
                });
            }

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
                const fullTitle = `${title} ${song.artist.name.toLowerCase()}`;

                // Excluir discografías y listas
                if (title.includes('discografía') ||
                    title.includes('discography') ||
                    title.includes('tracklist') ||
                    title.includes('álbum') ||
                    title.includes('album') ||
                    title.includes(' list') ||
                    title.includes('playlist') ||
                    title.includes('collection') ||
                    title.includes('canciones de ') ||
                    title.includes('songs by ') ||
                    title.includes('community') ||
                    title.includes('favoritos') ||
                    title.includes('favorites') ||
                    title.includes('lieblingsalben') ||
                    title.includes('top ') ||
                    title.includes('best of') ||
                    title.includes('greatest hits') ||
                    title.match(/^\d{4}/) || // Empieza con año
                    fullTitle.includes('música en español') ||
                    fullTitle.includes('music in')) {
                    return false;
                }

                // Excluir si el título es solo el nombre del artista
                const artistName = song.artist.name.toLowerCase();
                if (title === artistName || title === `${artistName} lyrics`) {
                    return false;
                }

                return true;
            });

            console.log('[Lyrics] Resultados después de filtrar:', filteredResults.length);

            if (filteredResults.length === 0) {
                console.log('[Lyrics] ❌ Todos los resultados fueron filtrados (álbumes/discografías)');
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
            console.log('[Lyrics] ✅ Canción seleccionada:', `"${song.title}" - ${song.artist.name}`);
            console.log('[Lyrics] ==========================================');

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
        // Remover emojis al inicio
        .replace(/^[\u{1F000}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?\s*/gu, '')
        // Remover metadata de álbumes, playlists, etc.
        .replace(/álbumes?\s+de\s+música.*/gi, '')
        .replace(/playlist.*/gi, '')
        .replace(/collection.*/gi, '')
        .replace(/discograf[íi]a.*/gi, '')
        .replace(/en\s+español\s+\d{4}/gi, '')
        .replace(/in\s+(english|spanish|português)\s+\d{4}/gi, '')
        // Remover indicadores de video oficial
        .replace(/\(official\s*(video|audio|music\s*video|lyric\s*video)?\)/gi, '')
        .replace(/\[official\s*(video|audio|music\s*video|lyric\s*video)?\]/gi, '')
        .replace(/-\s*(official\s*)?(video|audio|music\s*video|lyric\s*video)/gi, '')
        // Remover "- Topic"
        .replace(/\s*-\s*topic$/gi, '')
        // Remover paréntesis/corchetes vacíos
        .replace(/\s*\(\s*\)/g, '')
        .replace(/\s*\[\s*\]/g, '')
        // Limpiar espacios múltiples
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
