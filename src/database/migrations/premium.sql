-- Premium System Migration
-- Adds support for premium users and premium features

-- Users table - tracks premium status
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar TEXT,
    premium_tier TEXT DEFAULT 'free' CHECK(premium_tier IN ('free', 'premium')),
    premium_since DATETIME,
    premium_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Premium usage tracking
CREATE TABLE IF NOT EXISTS premium_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Favorites table - premium feature for saving favorite tracks
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    track_author TEXT NOT NULL,
    track_uri TEXT NOT NULL,
    track_thumbnail TEXT,
    track_duration INTEGER,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, track_uri)
);

-- Autoplay settings per guild
CREATE TABLE IF NOT EXISTS autoplay_settings (
    guild_id TEXT PRIMARY KEY,
    enabled BOOLEAN DEFAULT 0,
    max_auto_tracks INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(premium_tier, premium_expires);
CREATE INDEX IF NOT EXISTS idx_premium_usage_user ON premium_usage(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, added_at);
CREATE INDEX IF NOT EXISTS idx_favorites_uri ON favorites(track_uri);
