import puppeteer from "puppeteer-core";
import chrome from "chrome-aws-lambda";
import cors from 'cors';

// CORS middleware configuration
const corsOptions = {
  origin: 'https://frontend-253d.onrender.com', // Allow only your frontend origin (for production)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

const corsMiddleware = cors(corsOptions);

export default async function handler(req, res) {
  // Apply CORS to the handler
  corsMiddleware(req, res, async () => {
    // Health Check for server status
    if (req.method === "GET" && req.url === "/status") {
      return res.status(200).json({ message: "Server Running" });
    }

    if (req.method === "POST") {
      try {
        const { fbLink, shareCount, interval, cookies } = req.body;

        console.log("Request body received:", { fbLink, shareCount, interval, cookies });

        // Validate inputs
        if (!fbLink || !shareCount || !interval || !cookies) {
          console.error("Missing required parameters");
          return res.status(400).json({ error: "Missing required parameters" });
        }

        if (interval < 1 || interval > 60) {
          console.error("Invalid interval:", interval);
          return res.status(400).json({ error: "Interval must be between 1 and 60 seconds" });
        }

        // Enhanced cookie validation
        if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
          console.error("Invalid cookies format:", cookies);
          return res.status(400).json({ error: "Cookies must be an array of objects with 'name' and 'value' as strings" });
        }

        let browser;
        try {
          console.log("Launching Puppeteer...");
          browser = await puppeteer.launch({
            executablePath: await chrome.executablePath,
            args: chrome.args,
            headless: chrome.headless,
          });

          const page = await browser.newPage();
          console.log("Puppeteer launched");

          // Set cookies for Facebook
          console.log("Setting cookies...");
          try {
            await page.setCookie(...cookies.map(cookie => ({
              name: cookie.name,
              value: cookie.value,
              domain: 'facebook.com',
            })));
          } catch (cookieError) {
            console.error("Error setting cookies:", cookieError);
            return res.status(400).json({ error: "Invalid cookies format or error setting cookies" });
          }

          console.log("Navigating to Facebook:", fbLink);
          try {
            await page.goto(fbLink, { waitUntil: "domcontentloaded" });
          } catch (navigationError) {
            console.error("Failed to load Facebook post:", navigationError);
            return res.status(500).json({ error: "Failed to load Facebook post" });
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
        return res.status(500).json({ error: "Failed to perform automated sharing" });
      }
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  });
}
