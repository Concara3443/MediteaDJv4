const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const MusicEmbeds = require('./embeds');

class PermissionChecker {
    /**
     * Verifica si el usuario está en un canal de voz
     */
    static inVoiceChannel(interaction) {
        if (!interaction.member.voice.channel) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No estás en un canal de voz',
                    'Debes estar en un canal de voz para usar este comando.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
        return true;
    }

    /**
     * Verifica si el bot está en un canal de voz
     */
    static botInVoiceChannel(interaction, player) {
        if (!player) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No estoy reproduciendo música',
                    'No hay un reproductor activo en este servidor.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
        return true;
    }

    /**
     * Verifica si el usuario y el bot están en el mismo canal
     */
    static inSameVoiceChannel(interaction, player) {
        if (!interaction.member.voice.channel) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No estás en un canal de voz',
                    'Debes estar en un canal de voz para usar este comando.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        if (!player) {
            return true; // Si no hay player, está bien
        }

        const botChannel = interaction.guild.members.me.voice.channel;
        if (botChannel && botChannel.id !== interaction.member.voice.channel.id) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No estás en mi canal de voz',
                    `Estoy reproduciendo música en ${botChannel.toString()}`
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        return true;
    }

    /**
     * Verifica si hay una cola activa
     */
    static hasQueue(interaction, player) {
        if (!player || !player.queue || player.queue.size === 0) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Cola vacía',
                    'No hay canciones en la cola de reproducción.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
        return true;
    }

    /**
     * Verifica si hay una canción reproduciéndose
     */
    static isPlaying(interaction, player) {
        if (!player || !player.queue.current) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'No hay música reproduciéndose',
                    'No estoy reproduciendo ninguna canción actualmente.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
        return true;
    }

    /**
     * Verifica permisos del bot en el canal de voz
     */
    static checkBotPermissions(interaction, channel) {
        const permissions = channel.permissionsFor(interaction.guild.members.me);

        if (!permissions.has(PermissionFlagsBits.Connect)) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Sin permisos',
                    'No tengo permiso para conectarme a ese canal de voz.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        if (!permissions.has(PermissionFlagsBits.Speak)) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Sin permisos',
                    'No tengo permiso para hablar en ese canal de voz.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        return true;
    }

    /**
     * Verificación completa para comandos de música
     */
    static async checkMusicPermissions(interaction, client, requiresPlayer = false) {
        // Verificar que Lavalink está conectado
        if (!client.kazagumo || !client.kazagumo.shoukaku || client.kazagumo.shoukaku.nodes.size === 0) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Lavalink no disponible',
                    'El servidor de música no está conectado. Por favor, espera un momento e inténtalo de nuevo.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return { success: false };
        }

        // Verificar que al menos un nodo está conectado
        // Estados: 0=CONNECTING, 1=NEARLY, 2=CONNECTED
        // Aceptar NEARLY (1) con stats O CONNECTED (2)
        const nodes = Array.from(client.kazagumo.shoukaku.nodes.values());
        const connectedNode = nodes.find(node =>
            node.state === 2 || (node.state === 1 && node.stats)
        );

        if (!connectedNode) {
            interaction.reply({
                embeds: [MusicEmbeds.error(
                    'Lavalink no disponible',
                    'El servidor de música no está conectado. Por favor, espera un momento e inténtalo de nuevo.'
                )],
                flags: MessageFlags.Ephemeral
            });
            return { success: false };
        }

        // Verificar que el usuario está en un canal de voz
        if (!this.inVoiceChannel(interaction)) {
            return { success: false };
        }

        const voiceChannel = interaction.member.voice.channel;

        // Verificar permisos del bot
        if (!this.checkBotPermissions(interaction, voiceChannel)) {
            return { success: false };
        }

        // Obtener o crear player
        let player = client.kazagumo.players.get(interaction.guild.id);

        if (requiresPlayer) {
            // Si se requiere player y no existe
            if (!this.botInVoiceChannel(interaction, player)) {
                return { success: false };
            }

            // Verificar que están en el mismo canal
            if (!this.inSameVoiceChannel(interaction, player)) {
                return { success: false };
            }
        } else {
            // Si no hay player, verificar si están en el mismo canal
            if (player && !this.inSameVoiceChannel(interaction, player)) {
                return { success: false };
            }
        }

        return {
            success: true,
            player,
            voiceChannel
        };
    }
}

module.exports = PermissionChecker;
