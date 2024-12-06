const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();

// Enable CORS for both production domain and localhost
const corsOptions = {
    origin: ['https://reyzhaven.com', 'http://localhost:3000'],  // Allow both your production and local domain
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON requests
app.use(express.json());

// Simulate sharing functionality with Puppeteer
async function sharePost(cookie, url, amount, interval) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set the cookie for authentication
    await page.setCookie({ name: 'cookie', value: cookie, domain: 'facebook.com' });

    // Navigate to the Facebook post URL
    await page.goto(url);

    // Wait for the share button to be available
    await page.waitForSelector('button[data-testid="share_button"]');
    
    // Simulate clicking the share button multiple times
    for (let i = 0; i < amount; i++) {
        console.log(`Sharing post... Share ${i + 1}`);

        // Click on the share button
        await page.click('button[data-testid="share_button"]');
        
        // Wait for the share modal to appear
        await page.waitForSelector('div[aria-label="Share"]');
        await page.click('div[aria-label="Share"]');

        // Wait for the interval before the next share
        await page.waitForTimeout(interval * 1000);
    }

    await browser.close();
    return `Successfully shared ${amount} times!`;
}

// API endpoint for sharing posts
app.post('/share', async (req, res) => {
    const { cookie, url, amount, interval } = req.body;

    if (!cookie || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    // Validate amount and interval
    if (amount <= 0 || amount > 200000) {
        return res.status(400).json({ error: 'Amount should be greater than zero and less than or equal to 200,000.' });
    }

    if (interval <= 0) {
        return res.status(400).json({ error: 'Interval should be greater than zero.' });
    }

    // Validate the URL
    const fbPostRegex = /^https:\/\/www\.facebook\.com\/.*\/posts\/\d+$/;
    if (!fbPostRegex.test(url)) {
        return res.status(400).json({ error: 'Invalid Facebook post URL.' });
    }

    try {
        const result = await sharePost(cookie, url, amount, interval);
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while sharing the post.' });
    }
});

// Default route to check if the server is working
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
