// Music timing constants
export const MUSIC_CONFIG = {
    INTRO_MS: 3000,
    FADE_TO_BG_MS: 2500,
    OUTRO_FADE_MS: 8000, // Increased to 8 seconds for a proper outro
    DEFAULT_MUSIC_URL: 'assets/music.mp3'
};

// Cache configuration
export const CACHE_CONFIG = {
    PREFIX: 'podcast_cache_v2_', // Changed prefix to invalidate old cache
    EXPIRY_DAYS: 7
};