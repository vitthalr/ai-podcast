import { CACHE_CONFIG } from './config.js';

// Cache management
export function getCacheKey(topic) {
    if (!topic?.trim()) return null;
    try {
        return CACHE_CONFIG.PREFIX + btoa(topic.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
    } catch (error) {
        console.warn('Failed to generate cache key:', error);
        return CACHE_CONFIG.PREFIX + topic.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    }
}

export function setCacheItem(key, data) {
    try {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            expires: Date.now() + (CACHE_CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
        console.warn('Failed to cache item:', error);
    }
}

export function getCacheItem(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const cacheItem = JSON.parse(item);
        if (Date.now() > cacheItem.expires) {
            localStorage.removeItem(key);
            return null;
        }
        return cacheItem.data;
    } catch (error) {
        console.warn('Failed to retrieve cache item:', error);
        return null;
    }
}

export function clearExpiredCache() {
    try {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const { expires } = JSON.parse(item);
                        if (now > expires) keysToRemove.push(key);
                    }
                } catch {
                    keysToRemove.push(key); // Remove corrupted entries
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
            console.log(`Cleared ${keysToRemove.length} expired cache entries`);
        }
    } catch (error) {
        console.warn('Failed to clear expired cache:', error);
    }
}