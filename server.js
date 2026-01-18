const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// LOGGING SYSTEM
// ============================================
const LOG_FILE = path.join(__dirname, 'logs', 'server.log');

// Ensure logs directory exists
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
}

function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        data
    };

    const logLine = JSON.stringify(logEntry);
    console.log(`[${timestamp}] [${level}] ${message}`, data ? JSON.stringify(data) : '');

    // Append to log file
    try {
        fs.appendFileSync(LOG_FILE, logLine + '\n');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

function logInfo(message, data = null) {
    log('INFO', message, data);
}

function logError(message, data = null) {
    log('ERROR', message, data);
}

function logDebug(message, data = null) {
    log('DEBUG', message, data);
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logInfo(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method === 'POST' ? { ...req.body, prompt: req.body?.prompt?.substring(0, 100) } : undefined
    });
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Explicit routes for SEO files with correct content-type
app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

// ============================================
// ANTHROPIC CLIENT
// ============================================
let anthropic = null;
try {
    if (process.env.ANTHROPIC_API_KEY) {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        logInfo('Anthropic client initialized successfully');
    } else {
        logError('ANTHROPIC_API_KEY not set!');
    }
} catch (err) {
    logError('Failed to initialize Anthropic client', { error: err.message });
}

// ============================================
// PMU IMAGES - Using reliable Unsplash direct URLs
// ============================================
const PMU_IMAGES = [
    {
        url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
        category: 'eyebrows',
        keywords: ['brow', 'microblad', 'nanoblad']
    },
    {
        url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80',
        category: 'lips',
        keywords: ['lip', 'blushing']
    },
    {
        url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80',
        category: 'beauty',
        keywords: ['beauty', 'face']
    },
    {
        url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
        category: 'beauty',
        keywords: ['woman', 'portrait']
    },
    {
        url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=800&q=80',
        category: 'natural',
        keywords: ['natural', 'skin']
    },
    {
        url: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&q=80',
        category: 'eyes',
        keywords: ['lash', 'liner', 'eye']
    },
    {
        url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80',
        category: 'professional',
        keywords: ['professional', 'business']
    },
    {
        url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
        category: 'makeup',
        keywords: ['makeup', 'cosmetic']
    }
];

// ============================================
// IMAGE FETCHING WITH RETRY AND LOGGING
// ============================================
async function fetchImageAsBase64(url, retries = 3) {
    logDebug('Fetching image', { url, retriesLeft: retries });

    return new Promise((resolve, reject) => {
        const makeRequest = (currentUrl, retriesLeft) => {
            const startTime = Date.now();

            https.get(currentUrl, (response) => {
                logDebug('Image response received', {
                    statusCode: response.statusCode,
                    contentType: response.headers['content-type'],
                    contentLength: response.headers['content-length']
                });

                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
                    const redirectUrl = response.headers.location;
                    logDebug('Following redirect', { from: currentUrl, to: redirectUrl });

                    if (redirectUrl.startsWith('http')) {
                        makeRequest(redirectUrl, retriesLeft);
                    } else {
                        // Relative redirect
                        const urlObj = new URL(currentUrl);
                        makeRequest(urlObj.origin + redirectUrl, retriesLeft);
                    }
                    return;
                }

                if (response.statusCode !== 200) {
                    const error = new Error(`HTTP ${response.statusCode}`);
                    logError('Image fetch failed', { url: currentUrl, statusCode: response.statusCode });

                    if (retriesLeft > 0) {
                        logDebug('Retrying image fetch', { retriesLeft: retriesLeft - 1 });
                        setTimeout(() => makeRequest(currentUrl, retriesLeft - 1), 1000);
                    } else {
                        reject(error);
                    }
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));

                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const base64 = buffer.toString('base64');
                    const contentType = response.headers['content-type'] || 'image/jpeg';
                    const duration = Date.now() - startTime;

                    logInfo('Image fetched successfully', {
                        url: currentUrl,
                        size: buffer.length,
                        contentType,
                        duration: `${duration}ms`
                    });

                    resolve(`data:${contentType};base64,${base64}`);
                });

                response.on('error', (err) => {
                    logError('Image response error', { url: currentUrl, error: err.message });
                    if (retriesLeft > 0) {
                        setTimeout(() => makeRequest(currentUrl, retriesLeft - 1), 1000);
                    } else {
                        reject(err);
                    }
                });

            }).on('error', (err) => {
                logError('Image request error', { url: currentUrl, error: err.message });
                if (retriesLeft > 0) {
                    setTimeout(() => makeRequest(currentUrl, retriesLeft - 1), 1000);
                } else {
                    reject(err);
                }
            });
        };

        makeRequest(url, retries);
    });
}

// ============================================
// IMAGE SELECTION LOGIC
// ============================================
function selectImageForTopic(prompt) {
    const promptLower = prompt.toLowerCase();
    logDebug('Selecting image for topic', { prompt: promptLower });

    // Find matching image based on keywords
    for (const img of PMU_IMAGES) {
        for (const keyword of img.keywords) {
            if (promptLower.includes(keyword)) {
                logDebug('Found matching image', { keyword, category: img.category, url: img.url });
                return img.url;
            }
        }
    }

    // Random fallback
    const randomIndex = Math.floor(Math.random() * PMU_IMAGES.length);
    const selected = PMU_IMAGES[randomIndex];
    logDebug('Using random image', { category: selected.category, url: selected.url });
    return selected.url;
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        anthropicConfigured: !!anthropic
    });
});

// View logs endpoint (for debugging)
app.get('/api/logs', (req, res) => {
    try {
        const lines = req.query.lines || 100;
        if (fs.existsSync(LOG_FILE)) {
            const content = fs.readFileSync(LOG_FILE, 'utf8');
            const allLines = content.trim().split('\n');
            const recentLines = allLines.slice(-lines);
            const logs = recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { raw: line };
                }
            });
            res.json({ logs });
        } else {
            res.json({ logs: [], message: 'No logs yet' });
        }
    } catch (err) {
        logError('Failed to read logs', { error: err.message });
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// Clear logs endpoint
app.delete('/api/logs', (req, res) => {
    try {
        if (fs.existsSync(LOG_FILE)) {
            fs.writeFileSync(LOG_FILE, '');
            logInfo('Logs cleared');
        }
        res.json({ success: true, message: 'Logs cleared' });
    } catch (err) {
        logError('Failed to clear logs', { error: err.message });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// AI Content Generation endpoint
app.post('/api/generate', async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    logInfo('Generate request started', { requestId });

    try {
        const { prompt, type, includeImage } = req.body;

        logDebug('Request details', { requestId, prompt, type, includeImage });

        if (!prompt) {
            logError('Missing prompt', { requestId });
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!anthropic) {
            logError('Anthropic client not initialized', { requestId });
            return res.status(500).json({ error: 'AI service not configured' });
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

        // Generate content with Claude
        logInfo('Calling Anthropic API', { requestId, model: 'claude-sonnet-4-20250514' });
        const startTime = Date.now();

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            system: systemPrompt
        });

        const apiDuration = Date.now() - startTime;
        logInfo('Anthropic API response received', {
            requestId,
            duration: `${apiDuration}ms`,
            inputTokens: message.usage?.input_tokens,
            outputTokens: message.usage?.output_tokens
        });

        const content = message.content[0].text;
        logDebug('Generated content', { requestId, contentLength: content.length });

        // Fetch image if requested
        let image = null;
        let imageError = null;

        if (includeImage !== false && type === 'post') {
            logInfo('Fetching image for post', { requestId });
            try {
                const imageUrl = selectImageForTopic(prompt);
                logDebug('Selected image URL', { requestId, imageUrl });

                image = await fetchImageAsBase64(imageUrl);
                logInfo('Image fetched successfully', {
                    requestId,
                    imageSize: image ? image.length : 0
                });
            } catch (imgError) {
                imageError = imgError.message;
                logError('Image fetch failed', {
                    requestId,
                    error: imgError.message,
                    stack: imgError.stack
                });
            }
        }

        const response = {
            success: true,
            content,
            image,
            requestId,
            debug: {
                imageRequested: includeImage !== false && type === 'post',
                imageSuccess: !!image,
                imageError: imageError
            }
        };

        logInfo('Generate request completed', {
            requestId,
            success: true,
            hasImage: !!image,
            totalDuration: `${Date.now() - startTime}ms`
        });

        res.json(response);

    } catch (error) {
        logError('Generate request failed', {
            requestId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'Failed to generate content',
            details: error.message,
            requestId
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    logError('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    logInfo(`Server started on port ${PORT}`);
    logInfo('Environment check', {
        nodeVersion: process.version,
        anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
        port: PORT
    });
});
