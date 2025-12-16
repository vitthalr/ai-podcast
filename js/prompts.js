import { elements } from './ui.js';

const STARTER_PROMPTS = [
    "The future of Artificial Intelligence",
    "History of Coffee",
    "Space Exploration in 2050",
    "Mindfulness and Meditation",
    "The Rise of Electric Vehicles",
    "Ancient Civilizations"
];

export function initPrompts() {
    const container = document.getElementById('starterPrompts');
    if (!container) return;

    STARTER_PROMPTS.forEach(prompt => {
        const btn = document.createElement('button');
        btn.className = 'text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-full transition-colors border border-gray-600';
        btn.textContent = prompt;
        btn.onclick = () => typeWriter(prompt);
        container.appendChild(btn);
    });
}

function typeWriter(text) {
    const input = elements.form.topicInput;
    input.value = '';
    input.focus();
    
    let i = 0;
    const speed = 50; // ms per char

    // Disable all prompt buttons during typing
    const buttons = document.querySelectorAll('#starterPrompts button');
    buttons.forEach(b => b.disabled = true);

    function type() {
        if (i < text.length) {
            input.value += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            // Re-enable buttons
            buttons.forEach(b => b.disabled = false);
            
            // Trigger generation automatically
            setTimeout(() => {
                elements.form.generateBtn.click();
            }, 500);
        }
    }

    type();
}
