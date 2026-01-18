const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// AI Content Generation endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, type } = req.body;

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
        res.json({ success: true, content });

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
