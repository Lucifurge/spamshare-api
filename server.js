const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

// Initialize the Express app
const app = express();

// Enable CORS
const corsOptions = {
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

// Middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON requests
app.use(express.json());

// Facebook API share endpoint
app.post('/share', async (req, res) => {
    const { userAccessToken, url, amount, interval } = req.body;

    // Validate inputs
    if (!userAccessToken || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields: userAccessToken, url, amount, and interval.' });
    }

    // Limit validation for shares and interval
    if (amount <= 0 || amount > 100000) {
        return res.status(400).json({ error: 'Amount must be between 1 and 100,000.' });
    }
    if (interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Interval must be between 1 and 60 seconds.' });
    }

    try {
        // Extract post ID from the URL
        const postId = extractPostId(url);
        if (!postId) {
            return res.status(400).json({ error: 'Invalid Facebook post URL. Please ensure the URL is valid.' });
        }

        console.log(`Preparing to share post ${postId} ${amount} times.`);

        // Loop to share the post the specified number of times
        for (let i = 0; i < amount; i++) {
            try {
                console.log(`Sharing post #${i + 1}`);

                // API call to share the post
                const response = await axios.post(
                    `https://graph.facebook.com/v17.0/me/feed`,
                    {
                        message: `Check out this amazing post!`,
                        link: url,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${userAccessToken}`,
                        },
                    }
                );

                console.log(`Share #${i + 1} successful:`, response.data);

                // Wait for the specified interval before the next share
                await new Promise(resolve => setTimeout(resolve, interval * 1000));
            } catch (error) {
                console.error(`Error sharing post #${i + 1}:`, error.response?.data || error.message);
            }
        }

        res.status(200).json({ message: `Successfully shared the post ${amount} times!` });
    } catch (error) {
        console.error('Unexpected error during share operation:', error.response?.data || error.message);
        res.status(500).json({ error: 'An error occurred while sharing the post.' });
    }
});

// Utility to extract Facebook post ID from a URL
function extractPostId(url) {
    const regex = /\/posts\/(\d+)|\/(\d+_\d+)/;
    const match = url.match(regex);
    return match ? match[1] || match[2] : null;
}

// Default route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
