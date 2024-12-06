const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const path = require('path');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();

// Enable CORS for specific origins
const corsOptions = {
    origin: ['https://reyzhaven.com', 'http://localhost:3000'], // Adjust origins as needed
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON requests
app.use(express.json());

// Simulate sharing functionality with Puppeteer
async function sharePost(cookie, url, amount, interval) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();

        // Set the cookie for authentication
        await page.setCookie({
            name: 'cookie',
            value: cookie,
            domain: '.facebook.com',
        });

        // Navigate to the Facebook post URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for the share button
        const shareButtonSelector = 'button[data-testid="share_button"]';
        await page.waitForSelector(shareButtonSelector);

        for (let i = 0; i < amount; i++) {
            console.log(`Sharing post... Share ${i + 1}`);

            // Click the share button
            await page.click(shareButtonSelector);

            // Wait for the share modal to appear
            const shareModalSelector = 'div[aria-label="Share"]';
            await page.waitForSelector(shareModalSelector);
            await page.click(shareModalSelector);

            // Wait for the interval before the next share
            await page.waitForTimeout(interval * 1000);
        }
    } catch (error) {
        console.error('Error during Puppeteer operation:', error);
        throw new Error('Puppeteer encountered an issue while sharing the post.');
    } finally {
        await browser.close();
    }

    return `Successfully shared ${amount} times!`;
}

// API endpoint for sharing posts
app.post('/share', async (req, res) => {
    const { cookie, url, amount, interval } = req.body;

    // Validate inputs
    if (!cookie || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    if (amount <= 0 || amount > 200000) {
        return res.status(400).json({ error: 'Amount must be between 1 and 200,000.' });
    }

    if (interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Interval must be between 1 and 60 seconds.' });
    }

    const fbPostRegex = /^https:\/\/www\.facebook\.com\/.*\/posts\/\d+$/;
    if (!fbPostRegex.test(url)) {
        return res.status(400).json({ error: 'Invalid Facebook post URL.' });
    }

    try {
        const result = await sharePost(cookie, url, amount, interval);
        res.status(200).json({ message: result });
    } catch (error) {
        console.error('Error in /share endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Default route to check if the server is working
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
