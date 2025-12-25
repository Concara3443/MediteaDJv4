const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const PlaylistModel = require('./models/Playlist');

class DatabaseManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        this.models = {};
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Crear directorio data si no existe
                const dataDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                // Conectar a la base de datos
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('[Database] Error al conectar:', err);
                        reject(err);
                        return;
                    }

                    console.log('[Database] Conectado exitosamente a la base de datos');

                    // Ejecutar migraciones
                    this.runMigrations()
                        .then(() => {
                            // Inicializar modelos
                            this.initializeModels();
                            resolve(this.db);
                        })
                        .catch(reject);
                });
            } catch (error) {
                console.error('[Database] Error al inicializar:', error);
                reject(error);
            }
        });
    }

    async runMigrations() {
        return new Promise((resolve, reject) => {
            try {
                const migrationPath = path.join(__dirname, 'migrations', 'initial.sql');
                const migration = fs.readFileSync(migrationPath, 'utf8');

                // Ejecutar todas las sentencias SQL
                this.db.exec(migration, (err) => {
                    if (err) {
                        console.error('[Database] Error al ejecutar migraciones:', err);
                        reject(err);
                        return;
                    }

                    console.log('[Database] Migraciones ejecutadas exitosamente');
                    resolve();
                });
            } catch (error) {
                console.error('[Database] Error al ejecutar migraciones:', error);
                reject(error);
            }
        });
    }

    initializeModels() {
        this.models.Playlist = new PlaylistModel(this.db);
        console.log('[Database] Modelos inicializados');
    }

    getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('[Database] Error al cerrar:', err);
                } else {
                    console.log('[Database] Conexión cerrada');
                }
            });
        }
    }
}

module.exports = DatabaseManager;
