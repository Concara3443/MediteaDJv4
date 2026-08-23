const { EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS, EMOJIS, TIMEOUTS } = require('../../config/constants');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Manejar autocomplete
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[Autocomplete] Error:`, error);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[Interaction] Comando ${interaction.commandName} no encontrado`);
            return;
        }

        // Sistema de cooldowns
        const { cooldowns } = client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Map());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = command.cooldown || TIMEOUTS.COMMAND_COOLDOWN;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.WARNING)
                            .setDescription(`${EMOJIS.WARNING} Espera ${timeLeft.toFixed(1)}s antes de usar \`${command.data.name}\` de nuevo.`)
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Ejecutar el comando
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`[Interaction] Error al ejecutar ${interaction.commandName}:`, error);

            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle(`${EMOJIS.ERROR} Error al ejecutar el comando`)
                .setDescription('Ocurrió un error al procesar este comando. Por favor, inténtalo de nuevo.')
                .setFooter({ text: 'Si el problema persiste, contacta al administrador del bot' });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    }
};
