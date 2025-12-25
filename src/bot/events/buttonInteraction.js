module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Solo procesar interacciones de botones
        if (!interaction.isButton()) return;

        // Solo procesar botones de música
        if (!interaction.customId.startsWith('music_')) return;

        const player = client.kazagumo.players.get(interaction.guild.id);

        // Verificar que el usuario esté en un canal de voz
        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ Debes estar en un canal de voz para usar los controles.',
                ephemeral: true
            });
        }

        // Verificar que el player existe
        if (!player) {
            return interaction.reply({
                content: '❌ No hay ninguna canción reproduciéndose.',
                ephemeral: true
            });
        }

        // Verificar que el usuario está en el mismo canal que el bot
        const botChannel = interaction.guild.members.me.voice.channel;
        if (botChannel && member.voice.channel.id !== botChannel.id) {
            return interaction.reply({
                content: '❌ Debes estar en el mismo canal de voz que el bot.',
                ephemeral: true
            });
        }

        try {
            switch (interaction.customId) {
                case 'music_pause':
                    player.pause(true);
                    await interaction.reply({
                        content: '⏸️ Música pausada',
                        ephemeral: true
                    });
                    break;

                case 'music_resume':
                    player.pause(false);
                    await interaction.reply({
                        content: '▶️ Música reanudada',
                        ephemeral: true
                    });
                    break;

                case 'music_skip':
                    if (player.queue.length === 0) {
                        await interaction.reply({
                            content: '❌ No hay más canciones en la cola',
                            ephemeral: true
                        });
                        return;
                    }
                    player.skip();
                    await interaction.reply({
                        content: '⏭️ Canción saltada',
                        ephemeral: true
                    });
                    break;

                case 'music_stop':
                    player.queue.clear();
                    player.destroy();
                    await interaction.reply({
                        content: '⏹️ Reproducción detenida y cola limpiada',
                        ephemeral: true
                    });
                    break;

                case 'music_previous':
                    // Por ahora deshabilitado
                    await interaction.reply({
                        content: '⚠️ Función no disponible aún',
                        ephemeral: true
                    });
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Botón desconocido',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('[ButtonInteraction] Error:', error);
            await interaction.reply({
                content: '❌ Ocurrió un error al ejecutar esta acción',
                ephemeral: true
            }).catch(() => {});
        }
    }
};
