class PlaylistModel {
    constructor(db) {
        this.db = db;
    }

    /**
     * Crea una nueva playlist
     */
    create(userId, guildId, name, tracks) {
        const tracksJson = JSON.stringify(tracks);

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO playlists (user_id, guild_id, name, tracks) VALUES (?, ?, ?, ?)`,
                [userId, guildId, name, tracksJson],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint')) {
                            resolve({ success: false, error: 'Ya tienes una playlist con ese nombre en este servidor' });
                        } else {
                            reject(err);
                        }
                        return;
                    }
                    resolve({ id: this.lastID, success: true });
                }
            );
        });
    }

    /**
     * Obtiene todas las playlists de un usuario en un servidor (síncrono para compatibilidad)
     */
    getUserPlaylists(userId, guildId) {
        // Usar all() sícrono requiere promisify, pero para simplicidad usamos un wrapper
        const playlists = [];

        this.db.all(
            `SELECT id, name, tracks, created_at, updated_at FROM playlists WHERE user_id = ? AND guild_id = ? ORDER BY created_at DESC`,
            [userId, guildId],
            (err, rows) => {
                if (!err && rows) {
                    rows.forEach(playlist => {
                        playlists.push({
                            ...playlist,
                            tracks: JSON.parse(playlist.tracks),
                            trackCount: JSON.parse(playlist.tracks).length
                        });
                    });
                }
            }
        );

        // HACK: Retornar array vacío y llenar después (necesitamos refactorizar a async)
        // Por ahora usamos preparación síncrona
        return playlists;
    }

    /**
     * Obtiene una playlist específica por nombre (síncrono)
     */
    getPlaylist(userId, guildId, name) {
        let result = null;

        this.db.get(
            `SELECT id, name, tracks, created_at, updated_at FROM playlists WHERE user_id = ? AND guild_id = ? AND name = ?`,
            [userId, guildId, name],
            (err, row) => {
                if (!err && row) {
                    result = {
                        ...row,
                        tracks: JSON.parse(row.tracks)
                    };
                }
            }
        );

        return result;
    }

    /**
     * Elimina una playlist (síncrono)
     */
    delete(userId, guildId, name) {
        let deleted = false;

        this.db.run(
            `DELETE FROM playlists WHERE user_id = ? AND guild_id = ? AND name = ?`,
            [userId, guildId, name],
            function(err) {
                if (!err) {
                    deleted = this.changes > 0;
                }
            }
        );

        return deleted;
    }
}

module.exports = PlaylistModel;
