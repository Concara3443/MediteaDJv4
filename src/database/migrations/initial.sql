-- Tabla de configuración de guilds
CREATE TABLE IF NOT EXISTS guilds (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT '!',
  music_channel_id TEXT,
  dj_role_id TEXT,
  volume INTEGER DEFAULT 50,
  announce_songs BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de playlists
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tracks TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id, name)
);

-- Tabla de estadísticas de reproducción
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_author TEXT NOT NULL,
  track_uri TEXT,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_playlists_user_guild ON playlists(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_stats_guild ON stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_stats_played_at ON stats(played_at);
