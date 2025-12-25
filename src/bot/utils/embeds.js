const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../../config/constants');
const { formatTime, progressBar } = require('./formatTime');

class MusicEmbeds {
    /**
     * Embed de canción añadida a la cola
     */
    static trackAdded(track, requester) {
        return new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({
                name: 'Añadido a la cola',
                iconURL: requester.displayAvatarURL()
            })
            .setTitle(track.title)
            .setURL(track.uri)
            .addFields(
                { name: 'Autor', value: track.author, inline: true },
                { name: 'Duración', value: formatTime(track.length), inline: true },
                { name: 'Solicitado por', value: requester.toString(), inline: true }
            )
            .setThumbnail(track.thumbnail || null)
            .setTimestamp();
    }

    /**
     * Embed de reproducción iniciada
     */
    static nowPlaying(track, requester) {
        return new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({
                name: 'Reproduciendo ahora',
                iconURL: 'https://i.imgur.com/0VW7jGe.gif'
            })
            .setTitle(track.title)
            .setURL(track.uri)
            .setDescription(`**Autor:** ${track.author}\n**Duración:** ${formatTime(track.length)}`)
            .setThumbnail(track.thumbnail || null)
            .setFooter({ text: `Solicitado por ${requester.tag}`, iconURL: requester.displayAvatarURL() })
            .setTimestamp();
    }

    /**
     * Embed genérico de éxito
     */
    static success(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${EMOJIS.SUCCESS} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed genérico de error
     */
    static error(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`${EMOJIS.ERROR} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed genérico de advertencia
     */
    static warning(title, description) {
        return new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`${EMOJIS.WARNING} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    /**
     * Embed de cola de reproducción
     */
    static queue(player, page = 1, itemsPerPage = 10) {
        const queue = player.queue;
        const current = player.queue.current;
        const totalPages = Math.ceil(queue.length / itemsPerPage) || 1;
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const tracks = queue.slice(start, end);

        let description = `**Reproduciendo:**\n[${current.title}](${current.uri}) - ${formatTime(current.length)}\n\n`;

        if (tracks.length > 0) {
            description += '**En cola:**\n';
            tracks.forEach((track, i) => {
                const index = start + i + 1;
                description += `\`${index}.\` [${track.title}](${track.uri}) - ${formatTime(track.length)}\n`;
            });
        } else {
            description += '**En cola:**\nNo hay canciones en cola';
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setTitle(`${EMOJIS.PLAYLIST} Cola de Reproducción`)
            .setDescription(description)
            .addFields(
                { name: 'Canciones en cola', value: String(queue.length), inline: true },
                { name: 'Duración total', value: formatTime(queue.reduce((acc, track) => acc + track.length, current.length)), inline: true },
                { name: 'Volumen', value: `${player.volume}%`, inline: true }
            )
            .setFooter({ text: `Página ${page}/${totalPages} • Loop: ${player.loop || 'Desactivado'}` })
            .setTimestamp();

        return embed;
    }

    /**
     * Embed de canción actual con progreso
     */
    static trackProgress(player) {
        const track = player.queue.current;
        const position = player.position;
        const duration = track.length;

        const bar = progressBar(position, duration, 20);

        return new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setTitle(`${EMOJIS.MUSIC} Reproduciendo`)
            .setDescription(
                `**[${track.title}](${track.uri})**\n` +
                `${track.author}\n\n` +
                `${bar}\n` +
                `\`${formatTime(position)}\` / \`${formatTime(duration)}\``
            )
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: 'Volumen', value: `${player.volume}%`, inline: true },
                { name: 'Loop', value: player.loop === 'track' ? 'Canción' : player.loop === 'queue' ? 'Cola' : 'Desactivado', inline: true },
                { name: 'En cola', value: String(player.queue.length), inline: true }
            )
            .setTimestamp();
    }
}

module.exports = MusicEmbeds;
