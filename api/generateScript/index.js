const axios = require('axios');

module.exports = async function (context, req) {
    const { topic, duration = 1 } = req.body; // duration in minutes, default 1
    
    if (!topic) {
        context.res = { status: 400, body: "Topic is required" };
        return;
    }
    
    // Calculate approximate words based on duration (150 words per minute)
    const targetWords = Math.round(duration * 150);
    const lengthGuidance = duration <= 1 
        ? `Keep the main conversation under ${duration} minute (~${targetWords} words total).`
        : `Keep the main conversation around ${duration} minutes (~${targetWords} words total).`;

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !deployment) {
        context.res = { status: 500, body: "Server misconfiguration: Missing OpenAI credentials" };
        return;
    }

    try {
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        
        const response = await axios.post(url, {
            messages: [
                {
                    role: 'system',
                    content: `You are a professional podcast script writer. Create a realistic, "unscripted" conversation between two hosts (Host 1 and Host 2) that feels relaxed, curious, and willingly engaged—never forced. Think mellow long-form chat (Joe Rogan vibe), not morning radio hype.

STYLE GUIDE:
- Casual & imperfect: sprinkle light filler words naturally (um, ah, like, you know, I mean) but don't spam them.
- Expressive cues: use [laugh], [sigh], [gasp], [clears throat] sparingly to guide delivery (do NOT write "ha ha ha").
- Tone cues: use [excited], [whisper], [thoughtful], [warm] at the start of sentences to set mood; avoid shouting.
- Interjections: "Right?", "Exactly.", "No way.", "Wait, really?", "I get that." to keep it conversational.
- Vibe: unhurried, curious, sometimes amused; sounds like they *want* to be there.

FORMAT (example):
Host 1: [warm] Hey everyone, settle in.
Host 2: [thoughtful] This topic is wild. I love it.
Host 1: Totally. It's kind of blowing my mind.

IMPORTANT: 
- START with: "Host 1: [warm] Hey everyone, welcome! Today we're diving into [topic]."
- END with: "Host 1: [warm] Alright, that's it for today. Thanks for tuning in!"

LENGTH: ${lengthGuidance}`
                },
                {
                    role: 'user',
                    content: `Generate a podcast conversation about: ${topic}`
                }
            ],
            temperature: 0.7,
            max_tokens: Math.min(Math.round(targetWords * 2.5), 4000) // Scale tokens with duration
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            }
        });

        context.res = {
            body: response.data
        };
    } catch (error) {
        context.log.error('OpenAI API Error:', error.response?.data || error.message);
        context.res = {
            status: error.response?.status || 500,
            body: error.response?.data || { error: error.message }
        };
    }
};
