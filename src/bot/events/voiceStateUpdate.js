const { TIMEOUTS } = require('../../config/constants');

// Map para almacenar timeouts de desconexión
const disconnectTimeouts = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guild = oldState.guild;
        const player = client.kazagumo.players.get(guild.id);

        // Si no hay player, no hacer nada
        if (!player) return;

        // Obtener el canal de voz del bot
        const botVoiceChannel = guild.members.me.voice.channel;

        // Si el bot no está en un canal de voz, no hacer nada
        if (!botVoiceChannel) return;

        // Si el evento no es del canal donde está el bot, ignorar
        if (oldState.channelId !== botVoiceChannel.id && newState.channelId !== botVoiceChannel.id) {
            return;
        }

        // Contar miembros en el canal (excluyendo bots)
        const members = botVoiceChannel.members.filter(member => !member.user.bot);

        // Si no hay miembros humanos en el canal
        if (members.size === 0) {
            // Ya hay un timeout programado, no crear otro
            if (disconnectTimeouts.has(guild.id)) {
                return;
            }

            // Programar desconexión
            const timeout = setTimeout(() => {
                // Verificar de nuevo después del timeout
                const currentChannel = guild.members.me.voice.channel;

                if (!currentChannel) {
                    disconnectTimeouts.delete(guild.id);
                    return;
                }

                const currentMembers = currentChannel.members.filter(member => !member.user.bot);

                if (currentMembers.size === 0) {
                    const currentPlayer = client.kazagumo.players.get(guild.id);
                    if (currentPlayer) {
                        // Limpiar cola y destruir player
                        currentPlayer.queue.clear();
                        currentPlayer.destroy();

                        // Enviar mensaje al canal de texto si existe
                        const textChannel = guild.channels.cache.get(currentPlayer.textId);
                        if (textChannel) {
                            textChannel.send({
                                embeds: [{
                                    color: 0xFEE75C,
                                    description: '⏹️ Me desconecté porque no había nadie en el canal de voz durante 30 segundos.'
                                }]
                            }).catch(err => console.error('[VoiceStateUpdate] Error al enviar mensaje:', err));
                        }
                    }
                }

                disconnectTimeouts.delete(guild.id);
            }, TIMEOUTS.PLAYER_DESTROY);

            disconnectTimeouts.set(guild.id, timeout);
        } else {
            // Hay usuarios en el canal, cancelar timeout si existe
            if (disconnectTimeouts.has(guild.id)) {
                clearTimeout(disconnectTimeouts.get(guild.id));
                disconnectTimeouts.delete(guild.id);
            }
        }
    }
};
