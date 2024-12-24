import { chromium } from 'playwright';
import cors from 'cors';

// CORS middleware
const corsMiddleware = cors({
  origin: '*', // Allow all origins (you can restrict this if needed)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
});

export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, async () => {
    // Health Check for server status
    if (req.method === "GET") {
      return res.status(200).json({ message: 'Server is up and running!' });
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
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

          return res.status(200).json({ message: `${sharedCount} shares completed successfully!` });

        } catch (error) {
          console.error("Error during sharing:", error);
          return res.status(500).json({ error: "Failed to perform automated sharing." });
        } finally {
          if (browser) {
            await browser.close();
          }
        }
      } catch (error) {
        console.error("General error in POST request:", error);
        return res.status(500).json({ error: "Failed to process your request." });
      }
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  });
}
