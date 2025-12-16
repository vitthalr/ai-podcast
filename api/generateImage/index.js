const axios = require('axios');

module.exports = async function (context, req) {
    const { topic } = req.body;
    
    if (!topic) {
        context.res = { status: 400, body: "Topic is required" };
        return;
    }

    const endpoint = process.env.AZURE_FLUX_ENDPOINT;
    const apiKey = process.env.AZURE_FLUX_API_KEY;

    if (!endpoint || !apiKey) {
        context.res = { status: 500, body: "Server misconfiguration: Missing Flux credentials" };
        return;
    }

    try {
        const safePrompt = `3D rendered podcast cover art about ${topic}, modern 3D design, depth and shadows, vibrant colors, professional lighting, cinematic style, high quality 3D illustration`;
        
        const response = await axios.post(endpoint, {
            prompt: safePrompt,
            n: 1,
            size: '1024x1024'
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
        context.log.error('Flux API Error:', error.response?.data || error.message);
        context.res = {
            status: error.response?.status || 500,
            body: error.response?.data || { error: error.message }
        };
    }
};
