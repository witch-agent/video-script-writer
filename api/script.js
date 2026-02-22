// Vercel API Route for Video Script Writer
// Deploy to Vercel and set MINIMAX_API_KEY in Vercel Dashboard

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_BASE_URL = 'https://api.minimax.io/anthropic';

// Style prompts
const formatPrompts = {
    tutorial: 'Create a tutorial video script. Clear, step-by-step instructions.',
    explainer: 'Create an explainer video script. Educational and informative.',
    review: 'Create a product/service review script. Balanced and honest.',
    vlog: 'Create a vlog script. Personal, conversational, engaging.',
    shorts: 'Create a short-form video script (under 60 seconds). Quick, punchy, viral-worthy.'
};

const tonePrompts = {
    professional: 'Professional, formal tone',
    casual: 'Casual, friendly tone',
    exciting: 'Exciting, energetic tone',
    educational: 'Educational, clear tone'
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { topic, description, duration, format, tone } = req.body;
        
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }
        
        // Check if API key is configured
        if (!MINIMAX_API_KEY) {
            return res.status(500).json({ 
                error: 'API key not configured',
                message: 'Please set MINIMAX_API_KEY in Vercel environment variables'
            });
        }
        
        const selectedFormat = format || 'tutorial';
        const selectedTone = tone || 'professional';
        const durationSec = parseInt(duration) || 180;
        
        const formatPrompt = formatPrompts[selectedFormat] || formatPrompts.tutorial;
        const tonePrompt = tonePrompts[selectedTone] || tonePrompts.professional;
        
        const durationText = durationSec < 60 
            ? `${durationSec} seconds` 
            : `${Math.floor(durationSec / 60)} minute${durationSec >= 120 ? 's' : ''}`;
        
        const userPrompt = `Create a ${durationText} video script about: ${topic}

Description: ${description || 'No description provided'}

Format: ${formatPrompt}
Tone: ${tonePrompt}

Structure the script with:
1. HOOK (first 3-5 seconds) - Grab attention
2. MAIN CONTENT - Core message
3. CALL TO ACTION - End strong

Write in a ${selectedTone} tone. Make it engaging and ready to record.`;

        // Call MiniMax API (Anthropic-compatible)
        const response = await fetch(`${MINIMAX_BASE_URL}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': MINIMAX_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'MiniMax-M2.5',
                max_tokens: 4096,
                system: 'You are a professional video script writer. Create engaging, well-structured video scripts optimized for the given duration and format.',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userPrompt
                            }
                        ]
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('MiniMax API error:', errorData);
            return res.status(response.status).json({ 
                error: 'API request failed',
                details: errorData
            });
        }
        
        const data = await response.json();
        
        // Extract the generated text from response
        let result = '';
        for (const block of data.content) {
            if (block.type === 'text') {
                result += block.text;
            } else if (block.type === 'thinking') {
                result += block.thinking;
            }
        }
        
        return res.status(200).json({ result });
        
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: error.message });
    }
}
