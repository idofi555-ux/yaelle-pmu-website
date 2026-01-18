const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Curated PMU/Beauty images for marketing
const PMU_IMAGES = [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', // eyebrows
    'https://images.unsplash.com/photo-1588006173527-4f1e9e5c3c0a?w=800&q=80', // beauty face
    'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80', // lips
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80', // beauty portrait
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80', // woman beauty
    'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800&q=80', // natural beauty
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&q=80', // eyebrow close
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80', // professional woman
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80', // beauty makeup
    'https://images.unsplash.com/photo-1595959183082-7b570b7e1dfa?w=800&q=80', // lips beauty
];

// Function to fetch image and convert to base64
async function fetchImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return fetchImageAsBase64(response.headers.location).then(resolve).catch(reject);
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const contentType = response.headers['content-type'] || 'image/jpeg';
                resolve(`data:${contentType};base64,${base64}`);
            });
            response.on('error', reject);
        }).on('error', reject);
    });
}

// Get relevant image based on keywords
function selectImageForTopic(prompt) {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('lip') || promptLower.includes('blushing')) {
        return PMU_IMAGES[2]; // lips
    } else if (promptLower.includes('brow') || promptLower.includes('microblad') || promptLower.includes('nanoblad')) {
        return PMU_IMAGES[0]; // eyebrows
    } else if (promptLower.includes('lash') || promptLower.includes('liner')) {
        return PMU_IMAGES[6]; // eye area
    } else {
        // Random beauty image
        return PMU_IMAGES[Math.floor(Math.random() * PMU_IMAGES.length)];
    }
}

// AI Content Generation endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, type, includeImage } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        let systemPrompt = '';
        let userPrompt = prompt;

        if (type === 'post') {
            systemPrompt = `You are a marketing expert for Yaelle PMU Art, a permanent makeup studio in Limassol, Cyprus.
You specialize in microblading, nanoblading, lip blushing, lash liner, and brow lamination.
Create engaging, professional social media content that:
- Highlights the artistry and expertise of permanent makeup
- Uses a warm, welcoming tone
- Includes relevant hashtags
- Is concise and impactful
Do not use emojis excessively - keep it elegant and professional.`;
            userPrompt = `Create a social media post about: ${prompt}

Include:
1. A catchy title (one line)
2. Engaging content (2-3 paragraphs)
3. A call to action
4. 5-7 relevant hashtags

Format the response as:
TITLE: [title here]
CONTENT: [content here]
HASHTAGS: [hashtags here]`;
        } else if (type === 'email') {
            systemPrompt = `You are a marketing expert for Yaelle PMU Art, a permanent makeup studio in Limassol, Cyprus.
Create professional email content that is warm, personal, and persuasive.
Keep the tone elegant and welcoming.`;
            userPrompt = `Write a marketing email about: ${prompt}

Include:
1. A compelling subject line
2. Email body that's personal and engaging
3. A clear call to action

Format the response as:
SUBJECT: [subject line here]
BODY: [email body here]`;
        }

        const message = await anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            system: systemPrompt
        });

        const content = message.content[0].text;

        // If image is requested, fetch a relevant one
        let image = null;
        if (includeImage !== false && type === 'post') {
            try {
                const imageUrl = selectImageForTopic(prompt);
                image = await fetchImageAsBase64(imageUrl);
            } catch (imgError) {
                console.error('Image fetch error:', imgError);
                // Continue without image
            }
        }

        res.json({ success: true, content, image });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            error: 'Failed to generate content',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
