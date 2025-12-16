// DOM element references
export const elements = {
    screens: {
        input: document.getElementById('inputScreen'),
        loading: document.getElementById('loadingScreen'),
        player: document.getElementById('playerScreen')
    },
    form: {
        topicInput: document.getElementById('topicInput'),
        generateBtn: document.getElementById('generateBtn'),
        btnText: document.getElementById('btnText'),
        btnLoader: document.getElementById('btnLoader')
    },
    player: {
        closeBtn: document.getElementById('closeBtn'),
        audioPlayer: document.getElementById('audioPlayer'),
        albumArt: document.getElementById('albumArt'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        playIcon: document.getElementById('playIcon'),
        pauseIcon: document.getElementById('pauseIcon'),
        progressBar: document.getElementById('progressBar'),
        seekBackBtn: document.getElementById('seekBackBtn'),
        seekFwdBtn: document.getElementById('seekFwdBtn'),
        title: document.getElementById('podcastTitle'),
        subtitle: document.getElementById('podcastSubtitle'),
        currentTime: document.getElementById('currentTime'),
        duration: document.getElementById('duration')
    },
    loading: {
        step1: document.getElementById('loadingStep1'),
        step2: document.getElementById('loadingStep2'),
        step3: document.getElementById('loadingStep3')
    }
};

// Screen management with optimized DOM manipulation
export function showScreen(screen) {
    // Use DocumentFragment for batch DOM updates if needed
    const screens = Object.values(elements.screens);
    
    // Only update classes that need changing
    screens.forEach(s => {
        if (s === screen && s.classList.contains('hidden')) {
            s.classList.remove('hidden');
        } else if (s !== screen && !s.classList.contains('hidden')) {
            s.classList.add('hidden');
        }
    });
}

export function activateLoadingStep(step) {
    const steps = Object.values(elements.loading);
    
    // Batch DOM updates for better performance
    steps.forEach(s => {
        if (s === step) {
            s.classList.remove('opacity-50');
            s.classList.add('opacity-100', 'scale-110');
        } else {
            s.classList.remove('opacity-100', 'scale-110');
            s.classList.add('opacity-50');
        }
    });
}