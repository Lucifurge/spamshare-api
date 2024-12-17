const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

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

  const cookieString = cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; '); // Format cookies properly

  try {
    for (let i = 0; i < amount; i++) {
      console.log(`Sharing post #${i + 1}`);
      try {
        const response = await axios.get(
          `https://www.facebook.com/sharer/sharer.php`,
          {
            params: { u: encodeURIComponent(url) }, // Properly encode the URL
            headers: {
              'Cookie': cookieString, // Pass user session cookies
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', // Mimic a browser
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Referer': 'https://www.facebook.com/', // Ensure proper referer header
              'Connection': 'keep-alive',
            },
          }
        );

        if (response.status === 200) {
          console.log(`Share #${i + 1} succeeded`);
        } else {
          console.error(`Share #${i + 1} returned unexpected status:`, response.status);
        }

        if (i < amount - 1) {
          // Wait for the specified interval before the next share
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
      } catch (error) {
        // Log more detailed error information
        console.error(
          `Share #${i + 1} failed:`,
          error.response?.status || 'No status',
          error.response?.data || error.message
        );
      }
    }

    res.status(200).json({ message: `Successfully processed ${amount} share attempts.` });
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
