import { MUSIC_CONFIG } from './config.js';
import { elements, showScreen, activateLoadingStep } from './ui.js';
import { fadeVolume, scriptToSSML, formatTime, mixAudio } from './utils.js';
import { generateCoverArt, generateScript, generateAudio } from './api.js';
import { clearExpiredCache, getCacheKey, getCacheItem } from './cache.js';
import { getPodcastFromDB, savePodcastToDB } from './db.js';
import { initPrompts } from './prompts.js';

// State variables
let currentAudioUrl = null;
let isGenerating = false; // Prevent multiple simultaneous generations

// Initialize
clearExpiredCache();
initPrompts();

// Debounce utility for event handlers
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Main generation flow
async function generatePodcast() {
    const topic = elements.form.topicInput.value.trim();
    if (!topic) {
        elements.form.topicInput.classList.add('border-red-500', 'shake');
        elements.form.topicInput.focus();
        setTimeout(() => elements.form.topicInput.classList.remove('shake'), 300);
        return;
    }
    
    // Prevent multiple simultaneous generations
    if (isGenerating) {
        console.log('Generation already in progress');
        return;
    }
    
    isGenerating = true;
    elements.form.generateBtn.disabled = true;
    elements.form.btnText.textContent = 'Generating...';
    elements.form.btnLoader.classList.remove('hidden');
    
    showScreen(elements.screens.loading);

    try {
        // Get selected duration
        const duration = parseFloat(document.getElementById('durationSelect').value);
        
        // Check if we have cached content
        const cacheKey = getCacheKey(topic);
        const mixedAudioCacheKey = cacheKey + `_mixed_${duration}`;
        
        // Check IndexedDB for the full mixed audio first
        const cachedMixedBlob = await getPodcastFromDB(mixedAudioCacheKey);
        
        if (cachedMixedBlob) {
            console.log('Found cached mixed audio for:', topic, 'duration:', duration);
            
            // We still need the cover art
            activateLoadingStep(elements.loading.step1);
            activateLoadingStep(elements.loading.step2);
            
            // Try to get cover art from cache or generate it
            const coverArtUrl = await generateCoverArt(topic);
            elements.player.albumArt.src = coverArtUrl;
            elements.player.title.textContent = topic;
            
            activateLoadingStep(elements.loading.step3);
            
            if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentAudioUrl);
            }
            
            const mixedAudioUrl = URL.createObjectURL(cachedMixedBlob);
            currentAudioUrl = mixedAudioUrl;
            elements.player.audioPlayer.src = mixedAudioUrl;
            
            // Reset album art animation
            elements.player.albumArt.classList.remove('spinning');
            elements.player.albumArt.style.animationPlayState = '';

            showScreen(elements.screens.player);
            setTimeout(() => elements.player.playPauseBtn.click(), 500);
            return; // Exit early since we have everything
        }

        // Check for cached script to log
        const cachedScript = getCacheItem(cacheKey + `_script_${duration}`);
        if (cachedScript) {
            console.log('Found cached script for:', topic);
        }

        // Step 1: Script & Cover Art (Parallel start)
        activateLoadingStep(elements.loading.step1);
        
        // Start both requests in parallel
        const scriptPromise = generateScript(topic, duration);
        const coverArtPromise = generateCoverArt(topic);
        
        // Wait for script first
        const script = await scriptPromise;

        // Step 2: Cover Art (Wait for completion)
        activateLoadingStep(elements.loading.step2);
        
        // Prepare SSML while waiting for cover art
        const ssml = scriptToSSML(script);
        
        // Wait for cover art
        const coverArtUrl = await coverArtPromise;

        elements.player.albumArt.src = coverArtUrl;
        elements.player.title.textContent = topic;

        // Step 3: Audio
        activateLoadingStep(elements.loading.step3);
        
        // Cleanup previous audio URL if it exists
        if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudioUrl);
        }
        
        const rawAudioUrl = await generateAudio(ssml, topic, duration);
        
        // Mix speech with background music
        const mixedAudioBlob = await mixAudio(rawAudioUrl, MUSIC_CONFIG.DEFAULT_MUSIC_URL, MUSIC_CONFIG);
        
        // Cache the mixed audio
        await savePodcastToDB(mixedAudioCacheKey, mixedAudioBlob);
        
        const mixedAudioUrl = URL.createObjectURL(mixedAudioBlob);
        
        currentAudioUrl = mixedAudioUrl;
        elements.player.audioPlayer.src = mixedAudioUrl;
        
        // Reset album art animation
        elements.player.albumArt.classList.remove('spinning');
        elements.player.albumArt.style.animationPlayState = '';

        // Show player
        showScreen(elements.screens.player);
        setTimeout(() => elements.player.playPauseBtn.click(), 500);

    } catch (err) {
        console.error(err);
        alert(`Error: ${err.message}`);
        showScreen(elements.screens.input);
    } finally {
        isGenerating = false;
        elements.form.generateBtn.disabled = false;
        elements.form.btnText.textContent = 'Generate Podcast';
        elements.form.btnLoader.classList.add('hidden');
    }
}

// Event listeners
elements.form.generateBtn.addEventListener('click', generatePodcast);

elements.player.closeBtn.addEventListener('click', () => {
    elements.player.audioPlayer.pause();
    showScreen(elements.screens.input);
});

elements.player.playPauseBtn.addEventListener('click', () => {
    if (elements.player.audioPlayer.paused) elements.player.audioPlayer.play();
    else elements.player.audioPlayer.pause();
});

elements.player.audioPlayer.addEventListener('play', async () => {
    elements.player.playIcon.classList.add('hidden');
    elements.player.pauseIcon.classList.remove('hidden');
    elements.player.albumArt.classList.add('spinning');
    elements.player.albumArt.style.animationPlayState = 'running';
});

elements.player.audioPlayer.addEventListener('pause', () => {
    elements.player.playIcon.classList.remove('hidden');
    elements.player.pauseIcon.classList.add('hidden');
    elements.player.albumArt.style.animationPlayState = 'paused';
});

elements.player.audioPlayer.addEventListener('ended', () => {
    elements.player.playIcon.classList.remove('hidden');
    elements.player.pauseIcon.classList.add('hidden');
    elements.player.albumArt.classList.remove('spinning');
    elements.player.albumArt.style.animationPlayState = '';
});

elements.player.audioPlayer.addEventListener('timeupdate', () => {
    const currentTime = elements.player.audioPlayer.currentTime;
    const duration = elements.player.audioPlayer.duration;
    
    elements.player.currentTime.textContent = formatTime(currentTime);
    if (duration) {
        elements.player.duration.textContent = formatTime(duration);
        elements.player.progressBar.value = (currentTime / duration) * 100;
    }
});

elements.player.progressBar.addEventListener('input', (e) => {
    const duration = elements.player.audioPlayer.duration;
    if (duration) {
        const seekTime = (e.target.value / 100) * duration;
        elements.player.audioPlayer.currentTime = seekTime;
    }
});

elements.player.seekBackBtn.addEventListener('click', () => {
    elements.player.audioPlayer.currentTime = Math.max(0, elements.player.audioPlayer.currentTime - 5);
});

elements.player.seekFwdBtn.addEventListener('click', () => {
    const duration = elements.player.audioPlayer.duration;
    if (duration) {
        elements.player.audioPlayer.currentTime = Math.min(duration, elements.player.audioPlayer.currentTime + 5);
    }
});

elements.player.audioPlayer.addEventListener('loadedmetadata', () => {
    elements.player.duration.textContent = formatTime(elements.player.audioPlayer.duration);
});

// Debounced event handlers for better performance
const debouncedGenerate = debounce(generatePodcast, 300);

elements.form.topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isGenerating) {
            generatePodcast();
        }
    }
});

// Add input validation feedback
elements.form.topicInput.addEventListener('input', debounce((e) => {
    const topic = e.target.value.trim();
    elements.form.generateBtn.disabled = !topic || isGenerating;
    if (topic) {
        elements.form.topicInput.classList.remove('border-red-500');
    }
}, 150));