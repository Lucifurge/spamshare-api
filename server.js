// Importing required dependencies
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Simulate sharing functionality (for testing purposes)
function sharePost(cookie, url, amount, interval) {
    return new Promise((resolve, reject) => {
        let shares = 0;

        const shareInterval = setInterval(() => {
            shares++;
            console.log(`Sharing post ${url}... Share ${shares}`);
            if (shares >= amount) {
                clearInterval(shareInterval);
                resolve(`Successfully shared ${amount} times!`);
            }
        }, interval * 1000); // Interval in milliseconds
    });
}

// API endpoint to handle the sharing requests
app.post('/share', async (req, res) => {
    const { cookie, url, amount, interval } = req.body;

    // Validate the input
    if (!cookie || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields (cookie, url, amount, interval).' });
    }

    // Validate amount and interval
    if (amount <= 0 || interval <= 0) {
        return res.status(400).json({ error: 'Amount and interval should be greater than zero.' });
    }

    try {
        const result = await sharePost(cookie, url, amount, interval);
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while sharing the post.' });
    }
});

// Default route to check if the server is running
app.get('/', (req, res) => {
    res.send('SpamShare API is working!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
