const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Utility function to introduce delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Share endpoint
app.post('/share', async (req, res) => {
  const { cookies, url, amount, interval } = req.body;

  // Validate input fields
  if (!cookies || !url || !amount || !interval) {
    return res.status(400).json({ error: 'Missing required fields: cookies, url, amount, interval.' });
  }

  const cookieString = cookies.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ');

  try {
    let successes = 0;
    let failures = 0;

    const sharePost = async (index) => {
      console.log(`Sharing post #${index + 1}`);
      try {
        const response = await axios.get('https://www.facebook.com/sharer/sharer.php', {
          params: { u: encodeURIComponent(url) },
          headers: {
            Cookie: cookieString,
            'User-Agent': `Mozilla/5.0 (Windows NT ${10 + Math.floor(Math.random() * 2)}.0; Win64; x64) AppleWebKit/537.${Math.floor(Math.random() * 100)} (KHTML, like Gecko) Chrome/${100 + Math.floor(Math.random() * 20)}.0.0.0 Safari/537.${Math.floor(Math.random() * 100)}`,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            Referer: 'https://www.facebook.com/',
            Connection: 'keep-alive',
          },
        });

        if (response.status === 200) {
          console.log(`Share #${index + 1} succeeded`);
          successes++;
        } else {
          console.error(`Share #${index + 1} returned unexpected status:`, response.status);
          failures++;
        }
      } catch (error) {
        failures++;
        console.error(
          `Share #${index + 1} failed:`,
          error.response?.status || 'No status',
          error.response?.data || error.message
        );
      }
    };

    const batchSize = 5; // Limit concurrent shares
    for (let i = 0; i < amount; i += batchSize) {
      const tasks = Array.from(
        { length: Math.min(batchSize, amount - i) },
        (_, j) => sharePost(i + j)
      );
      await Promise.all(tasks);
      if (i + batchSize < amount) {
        await delay(interval * 1000); // Wait for the specified interval
      }
    }

    res.status(200).json({
      message: `Successfully processed ${successes} shares with ${failures} failures.`,
    });
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
