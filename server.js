const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Utility to extract Facebook post ID from various URL formats
function extractPostId(url) {
    const patterns = [
        /facebook\.com\/(?:[^\/]+)\/(?:posts|photos|videos|activity)\/(\d+)/,
        /facebook\.com\/photo\.php\?fbid=(\d+)/,
        /facebook\.com\/(?:profile\.php\?id=|)(\d+)/,
        /facebook\.com\/sharer\/sharer\.php\?u=([^&]+)/,
        /facebook\.com\/([^?&\/]+)/, // Fallback pattern
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    }

    return null; // Return null if no pattern matches
}

// Share endpoint
app.post('/share', async (req, res) => {
    const { cookies, url, amount, interval } = req.body;

    // Validate input fields
    if (!cookies || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Missing required fields: cookies, url, amount, interval.' });
    }
    if (amount <= 0 || amount > 100000) {
        return res.status(400).json({ error: 'Amount must be between 1 and 100,000.' });
    }
    if (interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Interval must be between 1 and 60 seconds.' });
    }

    // Extract post ID from the provided URL
    const postId = extractPostId(url);
    if (!postId) {
        return res.status(400).json({ error: 'Invalid Facebook URL. Ensure the URL is properly formatted.' });
    }

    console.log(`Preparing to share content with ID: ${postId}, ${amount} times.`);

    try {
        for (let i = 0; i < amount; i++) {
            try {
                console.log(`Sharing post #${i + 1}`);

                const response = await axios.post(
                    `https://graph.facebook.com/v17.0/me/feed`,
                    {
                        message: `Check out this amazing content!`,
                        link: url,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': cookies.join('; '), // Pass cookies directly
                        },
                    }
                );

                console.log(`Share #${i + 1} succeeded:`, response.data);

                if (i < amount - 1) {
                    await new Promise(resolve => setTimeout(resolve, interval * 1000)); // Wait for the specified interval
                }
            } catch (error) {
                console.error(`Share #${i + 1} failed:`, error.response?.data || error.message);
            }
        }

        res.status(200).json({ message: `Successfully shared the content ${amount} times.` });
    } catch (error) {
        console.error('Unexpected error:', error.response?.data || error.message);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
