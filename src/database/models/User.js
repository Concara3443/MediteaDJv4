/**
 * User Model - Manages premium users and their features
 */
class UserModel {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get user by ID
     * @param {string} userId - Discord user ID
     * @returns {Promise<Object|null>}
     */
    async getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Create or update user
     * @param {string} userId - Discord user ID
     * @param {Object} userData - User data
     * @returns {Promise<void>}
     */
    async upsertUser(userId, userData) {
        return new Promise((resolve, reject) => {
            const { username, discriminator, avatar } = userData;

            this.db.run(
                `INSERT INTO users (user_id, username, discriminator, avatar, updated_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(user_id) DO UPDATE SET
                    username = excluded.username,
                    discriminator = excluded.discriminator,
                    avatar = excluded.avatar,
                    updated_at = CURRENT_TIMESTAMP`,
                [userId, username, discriminator, avatar],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Check if user is premium (and not expired)
     * @param {string} userId - Discord user ID
     * @returns {Promise<boolean>}
     */
    async isPremium(userId) {
        // TEMPORARY: Everyone is premium by default
        // Remove this return statement to enable premium system
        return Promise.resolve(true);

        /* UNCOMMENT TO ENABLE PREMIUM SYSTEM:
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT premium_tier, premium_expires FROM users WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // If user doesn't exist, they're not premium
                    if (!row) {
                        resolve(false);
                        return;
                    }

                    // If tier is free, not premium
                    if (row.premium_tier === 'free') {
                        resolve(false);
                        return;
                    }

                    // If premium but expired, return false
                    if (row.premium_expires) {
                        const expirationDate = new Date(row.premium_expires);
                        const now = new Date();

                        if (now > expirationDate) {
                            // Premium expired, downgrade to free
                            this.setPremium(userId, 'free', null).catch(console.error);
                            resolve(false);
                            return;
                        }
                    }

                    // User is premium and not expired
                    resolve(true);
                }
            );
        });
        */
    }

    /**
     * Set user premium status
     * @param {string} userId - Discord user ID
     * @param {string} tier - 'free' or 'premium'
     * @param {Date|null} expiresAt - Expiration date (null for permanent)
     * @returns {Promise<void>}
     */
    async setPremium(userId, tier = 'premium', expiresAt = null) {
        return new Promise((resolve, reject) => {
            const premium_since = tier === 'premium' ? new Date().toISOString() : null;
            const premium_expires = expiresAt ? expiresAt.toISOString() : null;

            this.db.run(
                `INSERT INTO users (user_id, username, premium_tier, premium_since, premium_expires)
                 VALUES (?, 'Unknown', ?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                    premium_tier = excluded.premium_tier,
                    premium_since = excluded.premium_since,
                    premium_expires = excluded.premium_expires,
                    updated_at = CURRENT_TIMESTAMP`,
                [userId, tier, premium_since, premium_expires],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Track premium feature usage
     * @param {string} userId - Discord user ID
     * @param {string} featureName - Feature name
     * @returns {Promise<void>}
     */
    async trackFeatureUsage(userId, featureName) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO premium_usage (user_id, feature_name) VALUES (?, ?)',
                [userId, featureName],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get user's favorite tracks
     * @param {string} userId - Discord user ID
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getFavorites(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM favorites
                 WHERE user_id = ?
                 ORDER BY added_at DESC
                 LIMIT ?`,
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    /**
     * Add track to favorites
     * @param {string} userId - Discord user ID
     * @param {Object} track - Track data
     * @returns {Promise<void>}
     */
    async addFavorite(userId, track) {
        return new Promise((resolve, reject) => {
            const { title, author, uri, thumbnail, duration } = track;

            this.db.run(
                `INSERT OR IGNORE INTO favorites
                 (user_id, track_title, track_author, track_uri, track_thumbnail, track_duration)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, title, author, uri, thumbnail, duration],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Remove track from favorites
     * @param {string} userId - Discord user ID
     * @param {string} trackUri - Track URI
     * @returns {Promise<void>}
     */
    async removeFavorite(userId, trackUri) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM favorites WHERE user_id = ? AND track_uri = ?',
                [userId, trackUri],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Check if track is favorited
     * @param {string} userId - Discord user ID
     * @param {string} trackUri - Track URI
     * @returns {Promise<boolean>}
     */
    async isFavorite(userId, trackUri) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id FROM favorites WHERE user_id = ? AND track_uri = ?',
                [userId, trackUri],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    /**
     * Get autoplay settings for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>}
     */
    async getAutoplaySettings(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM autoplay_settings WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { enabled: false, max_auto_tracks: 50 });
                }
            );
        });
    }

    /**
     * Set autoplay for a guild
     * @param {string} guildId - Guild ID
     * @param {boolean} enabled - Enable/disable autoplay
     * @returns {Promise<void>}
     */
    async setAutoplay(guildId, enabled) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO autoplay_settings (guild_id, enabled, updated_at)
                 VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(guild_id) DO UPDATE SET
                    enabled = excluded.enabled,
                    updated_at = CURRENT_TIMESTAMP`,
                [guildId, enabled ? 1 : 0],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

module.exports = UserModel;
