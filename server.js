// Utility to extract Facebook post ID from various URL formats
function extractPostId(url) {
    const patterns = [
        // Match post URLs
        /facebook\.com\/(?:[^\/]+)\/(?:posts|photos|videos|activity)\/(\d+)/,
        // Match photo URLs
        /facebook\.com\/photo\.php\?fbid=(\d+)/,
        // Match profile URLs
        /facebook\.com\/(?:profile\.php\?id=|)(\d+)/,
        // Match share URLs
        /facebook\.com\/sharer\/sharer\.php\?u=([^&]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1]; // Return the extracted post/profile ID or shared content
        }
    }

    // If no pattern matches, return null
    return null;
}

// Facebook API share endpoint
app.post('/share', async (req, res) => {
    const { cookies, url, amount, interval } = req.body;

    // Validate inputs
    if (!cookies || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields: cookies, url, amount, and interval.' });
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
            return res.status(400).json({ error: 'Invalid or unsupported Facebook URL. Please ensure the URL is valid.' });
        }

        console.log(`Preparing to share post ${postId} ${amount} times.`);

        // Loop to share the post the specified number of times
        for (let i = 0; i < amount; i++) {
            try {
                console.log(`Sharing post #${i + 1}`);

                // API call to share the post using cookies in the request header
                const response = await axios.post(
                    `https://graph.facebook.com/v17.0/me/feed`,
                    {
                        message: `Check out this amazing content!`,
                        link: url,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': cookies.join('; '), // Pass cookies as the Cookie header
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
