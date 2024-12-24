import { chromium } from 'playwright-core'; // Use playwright-core for serverless environments
import cors from 'cors';

// CORS middleware to handle cross-origin requests
const corsMiddleware = cors({
  origin: 'https://frontend-253d.onrender.com', // Allow only this frontend to make requests
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  preflightContinue: false, // Don't need to manually handle OPTIONS request
  optionsSuccessStatus: 200, // For legacy browsers
});

export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, async () => {
    if (req.method === "GET") {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Server is Running</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f4f4f4;
              color: #333;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Server is Up and Running!</h1>
        </body>
        </html>
      `);
    }

    if (req.method === "POST") {
      try {
        const { fbLink, shareCount, interval, cookies } = req.body;

        if (!fbLink || !shareCount || !interval || !Array.isArray(cookies)) {
          return res.status(400).json({ error: "Missing or invalid parameters" });
        }

        if (interval < 0.5 || interval > 60) {
          return res.status(400).json({ error: "Interval must be between 0.5 and 60 seconds" });
        }
        if (shareCount > 100000) {
          return res.status(400).json({ error: "Share count cannot exceed 100,000" });
        }

        const validCookies = cookies.every(cookie =>
          cookie.key && cookie.value && cookie.domain && cookie.path
        );

        if (!validCookies) {
          return res.status(400).json({ error: "Invalid cookie format" });
        }

        let browser;
        try {
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'],
          });

          const page = await browser.newPage();

          // Map cookies to the format required by Playwright
          const formattedCookies = cookies.map(cookie => ({
            name: cookie.key,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
          }));

          // Set cookies on Facebook
          await page.context().addCookies(formattedCookies);

          // Navigate to Facebook post
          await page.goto(fbLink, { waitUntil: "domcontentloaded" });

          // Share the post
          let sharedCount = 0;
          while (sharedCount < shareCount) {
            try {
              await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
              await page.click('div[data-testid="share_button"]');

              await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
              await page.click('button[data-testid="share_dialog_button"]');

              sharedCount++;
              await page.waitForTimeout(interval * 1000);
            } catch (err) {
              console.error('Error during sharing:', err);
              break;
            }
          }

          return res.status(200).json({ message: `${sharedCount} shares completed successfully!` });
        } catch (err) {
          console.error('Playwright error:', err);
          return res.status(500).json({ error: "Automation failed" });
        } finally {
          if (browser) await browser.close();
        }
      } catch (err) {
        console.error('General error:', err);
        return res.status(500).json({ error: "Server error" });
      }
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  });
}
