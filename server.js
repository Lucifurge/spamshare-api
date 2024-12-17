const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Share endpoint
app.post('/share', async (req, res) => {
    const { cookies, url, amount, interval } = req.body;

    // Validate input fields
    if (!cookies || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Missing required fields: cookies, url, amount, interval.' });
    }

    // Ensure the share amount is between 1 and 100,000
    if (amount <= 0 || amount > 100000) {
        return res.status(400).json({ error: 'Amount must be between 1 and 100,000.' });
    }

    // Ensure the interval is between 1 and 60 seconds
    if (interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Interval must be between 1 and 60 seconds.' });
    }

    const cookieString = cookies.join('; '); // Format cookies for the HTTP request header

    try {
        for (let i = 0; i < amount; i++) {
            console.log(`Sharing post #${i + 1}`);
            try {
                const response = await axios.post(
                    `https://www.facebook.com/sharer/sharer.php`,
                    new URLSearchParams({
                        u: url, // The post URL to share
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Cookie': cookieString, // Pass user session cookies
                        },
                    }
                );

                console.log(`Share #${i + 1} succeeded:`, response.status);
                if (i < amount - 1) {
                    // Wait for the specified interval before the next share
                    await new Promise(resolve => setTimeout(resolve, interval * 1000));
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
