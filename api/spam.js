import { chromium } from 'playwright';
import cors from 'cors';

// CORS middleware
const corsMiddleware = cors({
  origin: '*', // Allow all origins (you can restrict this if needed)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
});

export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, async () => {
    // Health Check for server status
    if (req.method === "GET" && req.url === "/status") {
      // Return a modern styled HTML response for server status
      return res.status(200).send(`
        <html>
          <head>
            <title>Server Status</title>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f0f4f8;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: #333;
              }
              .container {
                text-align: center;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                padding: 40px;
                width: 300px;
              }
              h1 {
                font-size: 2rem;
                color: #4CAF50;
                margin-bottom: 20px;
              }
              p {
                font-size: 1rem;
                color: #555;
              }
              .status {
                font-weight: bold;
                color: #4CAF50;
                font-size: 1.2rem;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Server Running</h1>
              <p>The server is up and running smoothly!</p>
              <div class="status">Status: <span>Online</span></div>
            </div>
          </body>
        </html>
      `);
    }

    // Handle POST request to share a Facebook post
    if (req.method === "POST") {
      try {
        const { fbLink, shareCount, interval, cookies } = req.body;

        console.log("Request body received:", { fbLink, shareCount, interval, cookies });

        // Validate inputs
        if (!fbLink || !shareCount || !interval || !cookies) {
          console.error("Missing required parameters");
          return res.status(400).json({ error: "Missing required parameters" });
        }

        // Check interval between 0.5 and 60
        if (interval < 0.5 || interval > 60) {
          console.error("Invalid interval:", interval);
          return res.status(400).json({ error: "Interval must be between 0.5 and 60 seconds" });
        }

        // Check share count limit (max 100,000)
        if (shareCount > 100000) {
          console.error("Exceeded share count limit:", shareCount);
          return res.status(400).json({ error: "Share count cannot exceed 100,000" });
        }

        // Validate cookies
        if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
          console.error("Invalid cookies format:", cookies);
          return res.status(400).json({ error: "Invalid cookies format" });
        }

        let browser;
        try {
          console.log("Launching Playwright...");
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });

          const page = await browser.newPage();
          console.log("Playwright launched");

          // Set cookies for Facebook
          console.log("Setting cookies...");
          try {
            await page.context().addCookies(cookies.map(cookie => ({
              name: cookie.name,
              value: cookie.value,
              domain: 'facebook.com',
            })));
          } catch (cookieError) {
            console.error("Error setting cookies:", cookieError);
            return res.status(400).json({ error: "Invalid cookies format" });
          }

          console.log("Navigating to Facebook:", fbLink);
          try {
            await page.goto(fbLink, { waitUntil: "domcontentloaded" });
          } catch (navigationError) {
            console.error("Failed to load Facebook post:", navigationError);
            return res.status(500).json({ error: "Failed to load Facebook post." });
          }

          // Share post a number of times
          let sharedCount = 0;
          while (sharedCount < shareCount) {
            try {
              console.log(`Sharing post... attempt #${sharedCount + 1}`);
              await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
              await page.click('div[data-testid="share_button"]');
              await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
              await page.click('button[data-testid="share_dialog_button"]');
              sharedCount++;
              console.log(`Shared ${sharedCount} time(s)`);
              console.log(`Waiting for ${interval} seconds...`);
              await page.waitForTimeout(interval * 1000);
            } catch (shareError) {
              console.error(`Error during share operation at count ${sharedCount}:`, shareError);
              break;
            }
          }

          console.log("All shares completed!");
          return res.status(200).json({ message: `${sharedCount} shares completed successfully!` });

        } finally {
          if (browser) {
            await browser.close();
          }
        }

      } catch (error) {
        console.error("Error in POST request:", error);
        return res.status(500).json({ error: "Failed to perform automated sharing." });
      }
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  });
}
