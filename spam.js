
import { chromium } from 'playwright-core'; // Use playwright-core for serverless environments
import cors from 'cors';

// CORS middleware to handle cross-origin requests
const corsMiddleware = cors({
origin: 'https://frontend-253d.onrender.com', // Allow only this frontend to make requests
methods: ['GET', 'POST'],
allowedHeaders: ['Content-Type'],
preflightContinue: false,  // Don't need to manually handle OPTIONS request
optionsSuccessStatus: 200, // For legacy browsers
});

export default async function handler(req, res) {
// Apply CORS middleware
corsMiddleware(req, res, async () => {
    // Health Check for server status
    if (req.method === "GET") {
    // Return a styled HTML page with a Vercel-like design
    return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server is Running</title>
        <style>
            body {
            font-family: 'Inter', sans-serif;
            background-color: #000000;
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
            }
            .container {
            max-width: 600px;
            padding: 20px;
            border-radius: 10px;
            background-color:rgb(0, 0, 0);
            box-shadow: 0 2px 10px rgba(7, 102, 142, 0.1);
            text-align: center;
            }
            h1 {
            font-size: 2.5rem;
            color:rgb(229, 229, 229);
            margin-bottom: 20px;
            }
            p {
            font-size: 1.1rem;
            color: #777;
            margin-bottom: 20px;
            }
            .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color:rgb(0, 0, 0);
            color: white;
            text-decoration: none;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
            }
            .btn:hover {
            background-color:rgb(133, 135, 137);
            }
        </style>
        </head>
        <body>
        <div class="container">
            <h1>Server is Up and Running!</h1>
            <p>Your server is currently active and processing requests.</p>
            <a href="/" class="btn">Go to Dashboard</a>
        </div>
        </body>
        </html>
    `);
    }

    // Handle POST request to share a Facebook post
    if (req.method === "POST") {
    try {
        const { fbLink, shareCount, interval, cookies } = req.body;

        // Validate inputs
        if (!fbLink || !shareCount || !interval || !cookies) {
        return res.status(400).json({ error: "Missing required parameters" });
        }

        // Interval validation: Must be between 0.5 and 60 seconds
        if (interval < 0.5 || interval > 60) {
        return res.status(400).json({ error: "Interval must be between 0.5 and 60 seconds" });
        }

        // Spam share limit: Cannot exceed 100,000
        if (shareCount > 100000) {
        return res.status(400).json({ error: "Share count cannot exceed 100,000" });
        }

        // Validate the format of the cookies (C3C utility format)
        if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.key !== 'string' || typeof cookie.value !== 'string')) {
        return res.status(400).json({ error: "Cookies must be in C3C utility format (key and value as strings)" });
        }

        let browser;
        try {
        // Launch Playwright with the necessary Chromium options for serverless
        browser = await chromium.launch({
            headless: true, // ensure headless mode
            args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-gpu', // added for serverless
            '--single-process', // added for serverless
            ],
        });

        const page = await browser.newPage();

        // Set cookies for Facebook using C3C utility format
        await page.context().addCookies(cookies.map(cookie => ({
            name: cookie.key, // Use key as cookie name
            value: cookie.value,
            domain: 'facebook.com',
        })));

        // Navigate to the Facebook post
        await page.goto(fbLink, { waitUntil: "domcontentloaded" });

        // Share post a number of times (up to the shareCount)
        let sharedCount = 0;
        while (sharedCount < shareCount) {
            try {
            // Wait for the share button and click it
            await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
            await page.click('div[data-testid="share_button"]');
            
            // Wait for the dialog and confirm share
            await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
            await page.click('button[data-testid="share_dialog_button"]');
            sharedCount++;

            // Wait for the specified interval before next share
            await page.waitForTimeout(interval * 1000); // wait for the specified interval (converted to milliseconds)
            } catch (shareError) {
            console.error('Error sharing post:', shareError);
            break; // If there's an issue with sharing, stop the process
            }
        }

        // Return success message with the number of shares completed
        return res.status(200).json({ message: `${sharedCount} shares completed successfully!` });

        } catch (error) {
        console.error("Error during sharing:", error);
        // Catch error from Playwright execution and respond with an error
        return res.status(500).json({ error: "Failed to perform automated sharing." });
        } finally {
        // Ensure the browser instance is closed to avoid resource leakage
        if (browser) {
            await browser.close();
        }
        }
    } catch (error) {
        console.error("General error in POST request:", error);
        // General error handler for failed request
        return res.status(500).json({ error: "Failed to process your request." });
    }
    } else {
    // Handle unsupported HTTP methods
    return res.status(405).json({ error: "Method Not Allowed" });
    }
});
}
