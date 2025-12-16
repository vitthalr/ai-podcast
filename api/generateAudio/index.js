const axios = require('axios');

module.exports = async function (context, req) {
    const { ssml } = req.body;
    
    if (!ssml) {
        context.res = { status: 400, body: "SSML is required" };
        return;
    }

    const region = process.env.AZURE_SPEECH_REGION;
    const key = process.env.AZURE_SPEECH_KEY;

    if (!region || !key) {
        context.res = { status: 500, body: "Server misconfiguration: Missing Speech credentials" };
        return;
    }

    try {
        const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
        
        const response = await axios.post(url, ssml, {
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
                'User-Agent': 'PodcastGenerator'
            },
            responseType: 'arraybuffer' // Important for binary data
        });

        context.res = {
            headers: {
                'Content-Type': 'audio/mpeg'
            },
            body: response.data,
            isRaw: true // Tell Azure Functions to send the buffer as-is
        };
    } catch (error) {
        context.log.error('Speech API Error:', error.response?.data || error.message);
        context.res = {
            status: error.response?.status || 500,
            body: error.message
        };
    }
};
