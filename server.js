const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();

// Enable CORS for specific origins
const corsOptions = {
    origin: [process.env.ALLOWED_ORIGIN || 'https://reyzhaven.com', 'http://localhost:3000'],
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON requests
app.use(express.json());

// API endpoint for sharing posts using Facebook Graph API
app.post('/share', async (req, res) => {
    const { userAccessToken, url, amount, interval } = req.body;

    // Use the provided token or fallback to a default one (from environment or hardcoded)
    const accessToken = userAccessToken || process.env.FACEBOOK_ACCESS_TOKEN;

    // Validate inputs
    if (!accessToken || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    if (amount <= 0 || amount > 200) {
        return res.status(400).json({ error: 'Amount must be between 1 and 200.' });
    }

    if (interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Interval must be between 1 and 60 seconds.' });
    }

    try {
        const postId = extractPostId(url); // Helper function to extract post ID
        if (!postId) {
            return res.status(400).json({ error: 'Invalid Facebook post URL.' });
        }

        // Loop to share the post multiple times
        for (let i = 0; i < amount; i++) {
            console.log(`Sharing post... Share ${i + 1}`);

            // Make the API call to share the post
            const response = await axios.post(
                `https://graph.facebook.com/v17.0/me/feed`,
                {
                    message: `Check out this post: ${url}`, // Message to accompany the shared post
                    link: url, // Link to the original post
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            console.log(`Share ${i + 1} successful:`, response.data);

            // Wait for the interval before the next share
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }

        res.status(200).json({ message: `Successfully shared ${amount} times!` });
    } catch (error) {
        console.error('Error sharing post:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to share the post. Ensure your token and URL are valid.' });
    }
});

// Helper function to extract post ID from URL
function extractPostId(url) {
    const regex = /\/posts\/(\d+)|\/\d+\/\d+/; // Support both post IDs and other variations
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Default route to check if the server is working
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
