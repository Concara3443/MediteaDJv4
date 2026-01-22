const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Activa/desactiva la reproducción automática')
        .addSubcommand(subcommand =>
            subcommand
                .setName('on')
                .setDescription('Activa el autoplay')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('Desactiva el autoplay')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Ver el estado del autoplay')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const userModel = client.db.models.User;

        try {
            switch (subcommand) {
                case 'on':
                    await handleOn(interaction, userModel);
                    break;
                case 'off':
                    await handleOff(interaction, userModel);
                    break;
                case 'status':
                    await handleStatus(interaction, userModel);
                    break;
            }
        } catch (error) {
            console.error('[Autoplay] Error:', error);
            await interaction.reply({
                content: 'Hubo un error al procesar tu solicitud.',
                ephemeral: true
            });
        }
    }
};

async function handleOn(interaction, userModel) {
    await userModel.setAutoplay(interaction.guildId, true);

    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('✅ Autoplay Activado')
        .setDescription('El bot agregará canciones similares automáticamente cuando la cola esté vacía.\n\n**Características:**\n• Busca música relacionada automáticamente\n• Mantiene la música reproduciéndose sin parar\n• Se puede desactivar con `/autoplay off`');

    await interaction.reply({ embeds: [embed] });
}

async function handleOff(interaction, userModel) {
    await userModel.setAutoplay(interaction.guildId, false);

    const embed = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setTitle('⏸️ Autoplay Desactivado')
        .setDescription('El bot se desconectará cuando la cola esté vacía.');

    await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction, userModel) {
    const settings = await userModel.getAutoplaySettings(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🎵 Estado del Autoplay')
        .addFields(
            {
                name: 'Estado',
                value: settings.enabled ? '✅ Activado' : '⏸️ Desactivado',
                inline: true
            },
            {
                name: 'Máximo de canciones',
                value: settings.max_auto_tracks?.toString() || '50',
                inline: true
            }
        )
        .setDescription(
            settings.enabled
                ? 'El autoplay está activo. El bot agregará canciones automáticamente.'
                : 'El autoplay está desactivado. Usa `/autoplay on` para activarlo.'
        );

    await interaction.reply({ embeds: [embed] });
}
