// Memoization cache for expensive operations
const memoCache = new Map();
const MAX_CACHE_SIZE = 50;

// Utility functions
export function fadeVolume(player, target, durationMs) {
    const start = player.volume;
    const delta = target - start;
    const startTime = performance.now();
    
    function step(now) {
        const t = Math.min(1, (now - startTime) / durationMs);
        player.volume = start + delta * t;
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

export function xmlEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function scriptToSSML(script) {
    // Check memoization cache
    const cacheKey = `ssml_${script.length}_${script.slice(0, 50)}`;
    if (memoCache.has(cacheKey)) {
        return memoCache.get(cacheKey);
    }
    
    const ssmlParts = [];
    const host1Voice = 'en-US-DerekMultilingualNeural'; 
    const host2Voice = 'en-US-NancyMultilingualNeural';
    const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Precompile regex patterns for better performance
    const hostRegex1 = /^Host\s*1\s*:/i;
    const hostRegex2 = /^Host\s*2\s*:/i;
    const emotionRegex = /\[.*?\]/g;

    for (let raw of lines) {
        let voice = host1Voice;
        let text = raw;

        if (hostRegex1.test(raw)) {
            text = raw.replace(hostRegex1, '').replace(/^\s*:\s*/, '');
            voice = host1Voice;
        } else if (hostRegex2.test(raw)) {
            text = raw.replace(hostRegex2, '').replace(/^\s*:\s*/, '');
            voice = host2Voice;
        }

        text = text.trim();
        if (!text) continue;

        let prosodyRate = '1.0';
        let prosodyPitch = '-1%';

        // Process emotions more efficiently
        const emotions = text.match(emotionRegex) || [];
        for (const emotion of emotions) {
            const type = emotion.toLowerCase();
            if (type.includes('laugh')) { prosodyPitch = '0%'; }
            else if (type.includes('sigh')) { prosodyPitch = '-2%'; prosodyRate = '0.97'; }
            else if (type.includes('gasp')) { prosodyRate = '1.0'; prosodyPitch = '0%'; }
            else if (type.includes('excited')) { prosodyRate = '1.02'; prosodyPitch = '0%'; }
            else if (type.includes('whisper')) { prosodyRate = '0.95'; prosodyPitch = '-1%'; }
        }
        
        text = text.replace(emotionRegex, '').trim();
        if (!text) { ssmlParts.push(`<break time="500ms"/>`); continue; }

        if (text.includes('!')) { prosodyRate = '1.01'; prosodyPitch = '0%'; }
        else if (text.includes('?')) { prosodyRate = '0.99'; prosodyPitch = '-1%'; }

        let escaped = xmlEscape(text)
            .replace(/\. /g, '.<break time="180ms"/> ')
            .replace(/! /g, '!<break time="220ms"/> ')
            .replace(/\? /g, '?<break time="200ms"/> ')
            .replace(/, /g, ', ')
            .replace(/\.\.\./g, '<break time="420ms"/>');

        const part = `
            <voice name="${voice}">
                <prosody rate="${prosodyRate}" pitch="${prosodyPitch}">
                    ${escaped}
                </prosody>
                <break time="220ms"/>
            </voice>`;
        ssmlParts.push(part);
    }

    const result = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    ${ssmlParts.join('\n')}
</speak>`;
    
    // Cache result with size limit
    if (memoCache.size >= MAX_CACHE_SIZE) {
        const firstKey = memoCache.keys().next().value;
        memoCache.delete(firstKey);
    }
    memoCache.set(cacheKey, result);
    
    return result;
}

export async function mixAudio(speechUrl, musicUrl, config) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Fetch and decode both audio files
    const [speechBuffer, musicBuffer] = await Promise.all([
        fetch(speechUrl).then(r => r.arrayBuffer()).then(b => audioContext.decodeAudioData(b)),
        fetch(musicUrl).then(r => r.arrayBuffer()).then(b => audioContext.decodeAudioData(b))
    ]);

    // Calculate total duration
    // Intro (3s) + Speech + Outro (3s)
    // Note: Speech starts after intro, but we overlap slightly for crossfade if needed
    // For this implementation:
    // 0s: Music starts (Intro)
    // 3s: Speech starts, Music fades to BG
    // Speech End: Music fades up (Outro)
    // Speech End + 3s: End
    
    const introDuration = config.INTRO_MS / 1000;
    const outroDuration = config.OUTRO_FADE_MS / 1000;
    const fadeDuration = 2.0; // 2 seconds fade transition
    
    const totalDuration = introDuration + speechBuffer.duration + outroDuration;
    
    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(2, totalDuration * 44100, 44100);
    
    // --- Speech Track ---
    const speechSource = offlineCtx.createBufferSource();
    speechSource.buffer = speechBuffer;
    speechSource.connect(offlineCtx.destination);
    speechSource.start(introDuration); // Start speech after intro
    
    // --- Background Music (Intro + Talk) ---
    const bgMusicSource = offlineCtx.createBufferSource();
    bgMusicSource.buffer = musicBuffer;
    bgMusicSource.loop = true;
    
    const bgMusicGain = offlineCtx.createGain();
    bgMusicSource.connect(bgMusicGain);
    bgMusicGain.connect(offlineCtx.destination);
    
    // BG Volume Automation (Intro only)
    const speechStart = introDuration;
    const speechEnd = speechStart + speechBuffer.duration;
    
    bgMusicGain.gain.setValueAtTime(0.8, 0); // Start high
    bgMusicGain.gain.setValueAtTime(0.8, Math.max(0, speechStart - fadeDuration));
    bgMusicGain.gain.linearRampToValueAtTime(0.0, speechStart); // Fade to complete silence
    
    bgMusicSource.start(0);
    bgMusicSource.stop(speechStart); // Stop intro music when speech starts

    // --- Outro Music (Restart from beginning) ---
    const outroMusicSource = offlineCtx.createBufferSource();
    outroMusicSource.buffer = musicBuffer;
    outroMusicSource.loop = false;
    
    const outroMusicGain = offlineCtx.createGain();
    outroMusicSource.connect(outroMusicGain);
    outroMusicGain.connect(offlineCtx.destination);
    
    // Outro Volume Automation
    outroMusicGain.gain.setValueAtTime(0.0, speechEnd); // Start silent
    outroMusicGain.gain.linearRampToValueAtTime(0.8, speechEnd + fadeDuration); // Fade in
    outroMusicGain.gain.setValueAtTime(0.8, totalDuration - fadeDuration);
    outroMusicGain.gain.linearRampToValueAtTime(0.0, totalDuration); // Fade out at end
    
    outroMusicSource.start(speechEnd);
    
    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert AudioBuffer to WAV Blob
    return bufferToWave(renderedBuffer, renderedBuffer.length);
}

// Helper to convert AudioBuffer to WAV Blob
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this example)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}