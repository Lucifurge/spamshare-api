// Importing required dependencies
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Simulate sharing functionality with Puppeteer
async function sharePost(cookie, url, amount, interval) {
    const browser = await puppeteer.launch({ headless: false });  // Set headless to false to see the browser
    const page = await browser.newPage();

    // Navigate to Facebook login page
    await page.goto('https://www.facebook.com/');

    // Log in (you should provide a valid cookie for authentication)
    await page.setCookie({ name: 'cookie', value: cookie, domain: 'facebook.com' });

    // Wait for Facebook to load the homepage
    await page.waitForSelector('div[aria-label="Create a post"]');

    // Navigate to the post URL
    await page.goto(url);
    
    // Share the post repeatedly
    for (let i = 0; i < amount; i++) {
        console.log(`Sharing post ${url}... Share ${i + 1}`);

        // Wait for the share button and click it
        await page.waitForSelector('button[data-testid="share_button"]');
        await page.click('button[data-testid="share_button"]');

        // Wait for share options to load and click "Share" (can be customized)
        await page.waitForSelector('div[aria-label="Share"]');
        await page.click('div[aria-label="Share"]');
        
        // Wait for interval before the next share
        await page.waitForTimeout(interval * 1000);
    }

    await browser.close();
    return `Successfully shared ${amount} times!`;
}

// API endpoint to handle the sharing requests
app.post('/share', async (req, res) => {
    const { cookie, url, amount, interval } = req.body;

    // Validate the input
    if (!cookie || !url || !amount || !interval) {
        return res.status(400).json({ error: 'Please provide all required fields (cookie, url, amount, interval).' });
    }

    // Validate amount and interval
    if (amount <= 0 || amount > 200000) {
        return res.status(400).json({ error: 'Amount should be greater than zero and less than or equal to 200,000.' });
    }

    if (interval <= 0) {
        return res.status(400).json({ error: 'Interval should be greater than zero.' });
    }

    // Validate the URL (check if it's a valid Facebook post URL)
    const fbPostRegex = /^https:\/\/www\.facebook\.com\/.*\/posts\/\d+$/;
    if (!fbPostRegex.test(url)) {
        return res.status(400).json({ error: 'Invalid Facebook post URL. Please provide a valid URL.' });
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
