import { getCacheKey, getCacheItem, setCacheItem } from './cache.js';
import { getPodcastFromDB, savePodcastToDB } from './db.js';

// Request deduplication maps
const pendingRequests = new Map();

export async function generateCoverArt(topic) {
    const cacheKey = getCacheKey(topic) + '_image';
    
    // Check IndexedDB first (since images are large)
    const cachedImage = await getPodcastFromDB(cacheKey);
    if (cachedImage) {
        console.log('Using cached cover art for:', topic);
        return cachedImage;
    }
    
    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
        console.log('Waiting for pending cover art request for:', topic);
        return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        try {
            const res = await fetch('/api/generateImage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });

            if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
            
            const data = await res.json();
            let imageUrl = data.data?.[0]?.url || data.url;
            
            if (!imageUrl && data.data?.[0]?.b64_json) {
                imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
            }
            
            if (!imageUrl) throw new Error('No image URL returned');
            
            // Convert URL to base64 for caching if it's not already
            if (!imageUrl.startsWith('data:')) {
                try {
                    const imgRes = await fetch(imageUrl);
                    const blob = await imgRes.blob();
                    imageUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (conversionError) {
                    console.warn('Failed to convert image to base64:', conversionError);
                    // Don't cache remote URLs as they expire
                    return imageUrl;
                }
            }
            
            // Cache the image in IndexedDB only if it's a data URL
            if (imageUrl.startsWith('data:')) {
                await savePodcastToDB(cacheKey, imageUrl);
            }
            return imageUrl;
        } catch (error) {
            console.error('Flux API Error:', error);
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%231db954" width="200" height="200"/><text x="50%" y="50%" fill="white" font-size="20" text-anchor="middle" dy=".3em">🎙️</text></svg>';
        } finally {
            pendingRequests.delete(cacheKey);
        }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

export async function generateScript(topic) {
    const cacheKey = getCacheKey(topic) + '_script';
    
    // Check cache first
    const cachedScript = getCacheItem(cacheKey);
    if (cachedScript) {
        console.log('Using cached script for:', topic);
        return cachedScript;
    }
    
    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
        console.log('Waiting for pending script request for:', topic);
        return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        try {
            const res = await fetch('/api/generateScript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });

            if (!res.ok) throw new Error(`Script generation failed: ${res.status}`);
            const data = await res.json();
            const script = data.choices[0].message.content;
            
            // Cache the script
            setCacheItem(cacheKey, script);
            return script;
        } finally {
            pendingRequests.delete(cacheKey);
        }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
}

export async function generateAudio(ssml, topic) {
    const cacheKey = getCacheKey(topic) + '_audio';
    
    // Check cache first
    const cachedAudio = getCacheItem(cacheKey);
    if (cachedAudio) {
        console.log('Using cached audio for:', topic);
        return cachedAudio;
    }
    
    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
        console.log('Waiting for pending audio request for:', topic);
        return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        try {
            const res = await fetch('/api/generateAudio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ssml })
            });

            if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
            const blob = await res.blob();
            
            // Return blob URL for immediate use
            return URL.createObjectURL(blob);
        } finally {
            pendingRequests.delete(cacheKey);
        }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
}