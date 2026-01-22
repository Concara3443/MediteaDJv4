const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../config/constants');

/**
 * Premium Checker Utility
 * Provides functions to check premium status and create upgrade embeds
 */
class PremiumChecker {
    constructor(db) {
        this.db = db;
        this.userModel = db.models.User;
    }

    /**
     * Check if user is premium
     * @param {string} userId - Discord user ID
     * @returns {Promise<boolean>}
     */
    async isPremiumUser(userId) {
        try {
            return await this.userModel.isPremium(userId);
        } catch (error) {
            console.error('[Premium] Error checking premium status:', error);
            return false;
        }
    }

    /**
     * Require premium for a command/interaction
     * Returns true if user is premium, false otherwise
     * If false, sends upgrade embed to the interaction
     * @param {Interaction} interaction - Discord interaction
     * @returns {Promise<boolean>}
     */
    async requirePremium(interaction) {
        const isPremium = await this.isPremiumUser(interaction.user.id);

        if (!isPremium) {
            const embed = this.getUpgradeEmbed();
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return false;
        }

        // Track premium feature usage
        try {
            await this.userModel.trackFeatureUsage(
                interaction.user.id,
                interaction.commandName
            );
        } catch (error) {
            console.error('[Premium] Error tracking feature usage:', error);
        }

        return true;
    }

    /**
     * Get upgrade embed for non-premium users
     * @returns {EmbedBuilder}
     */
    getUpgradeEmbed() {
        return new EmbedBuilder()
            .setColor(COLORS.WARNING || '#FFC200')
            .setTitle('🌟 Función Premium')
            .setDescription('Esta función está disponible solo para usuarios premium de Meditea DJ.')
            .addFields(
                {
                    name: '✨ Funciones Premium',
                    value: [
                        '• 🔍 Búsqueda de canciones desde el dashboard web',
                        '• 🎤 Letras sincronizadas en tiempo real',
                        '• ⭐ Sistema de favoritos personalizado',
                        '• 📜 Historial completo de reproducción',
                        '• 🤖 Autoplay inteligente',
                        '• 🎵 Cola extendida (500 canciones)',
                        '• 📋 Playlists más grandes (200 canciones)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💎 ¿Cómo obtener Premium?',
                    value: 'Contacta con el administrador del bot para obtener acceso premium.',
                    inline: false
                }
            )
            .setFooter({
                text: 'Meditea DJ Premium • https://guillermocort.es/mediteadj/'
            })
            .setTimestamp();
    }

    /**
     * Get premium features list
     * @returns {Array<string>}
     */
    getPremiumFeatures() {
        return [
            'dashboard_search',
            'synchronized_lyrics',
            'favorites',
            'queue_history',
            'autoplay',
            'extended_queue',
            'extended_playlists',
            'lyrics_search'
        ];
    }

    /**
     * Grant premium to a user
     * @param {string} userId - Discord user ID
     * @param {number} days - Number of days (0 for permanent)
     * @returns {Promise<void>}
     */
    async grantPremium(userId, days = 30) {
        const expiresAt = days > 0
            ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
            : null;

        await this.userModel.setPremium(userId, 'premium', expiresAt);
        console.log(`[Premium] Granted premium to ${userId} for ${days || 'permanent'} days`);
    }

    /**
     * Revoke premium from a user
     * @param {string} userId - Discord user ID
     * @returns {Promise<void>}
     */
    async revokePremium(userId) {
        await this.userModel.setPremium(userId, 'free', null);
        console.log(`[Premium] Revoked premium from ${userId}`);
    }

    /**
     * Get premium stats
     * @returns {Promise<Object>}
     */
    async getPremiumStats() {
        return new Promise((resolve, reject) => {
            this.db.getDatabase().get(
                `SELECT
                    COUNT(*) as total_users,
                    SUM(CASE WHEN premium_tier = 'premium' THEN 1 ELSE 0 END) as premium_users
                 FROM users`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { total_users: 0, premium_users: 0 });
                }
            );
        });
    }
}

module.exports = PremiumChecker;
