import { chromium } from 'playwright-core';
import cors from 'cors';

// CORS middleware
const corsMiddleware = cors({
  origin: 'https://frontend-253d.onrender.com', // Allow only this frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
});

export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, async () => {
    if (req.method === 'POST') {
      try {
        const { fbLink, shareCount, interval, cookies } = req.body;

        // Validate required fields
        if (!fbLink || !shareCount || !interval || !Array.isArray(cookies)) {
          return res.status(400).json({ error: 'Missing or invalid parameters' });
        }

        if (interval < 0.5 || interval > 60) {
          return res.status(400).json({ error: 'Interval must be between 0.5 and 60 seconds' });
        }

        if (shareCount > 200000) {
          return res.status(400).json({ error: 'Share count cannot exceed 200,000' });
        }

        // Map input cookies to Playwright-compatible format
        const formattedCookies = cookies.map(({ key, value, domain, path }) => ({
          name: key,
          value,
          domain: domain || 'facebook.com', // Default to 'facebook.com' if domain is not provided
          path: path || '/', // Default to '/' if path is not provided
        }));

        let browser;
        try {
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process'],
          });

          const page = await browser.newPage();

          // Set cookies in the browser
          await page.context().addCookies(formattedCookies);

          // Navigate to the Facebook post
          await page.goto(fbLink, { waitUntil: 'domcontentloaded' });

          // Automate the sharing process
          let sharedCount = 0;
          while (sharedCount < shareCount) {
            try {
              await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
              await page.click('div[data-testid="share_button"]');

              await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
              await page.click('button[data-testid="share_dialog_button"]');

              sharedCount++;
              console.log(`Successfully shared ${sharedCount}/${shareCount} times`);
              await page.waitForTimeout(interval * 1000);
            } catch (err) {
              console.error('Error during sharing:', err);
              break;
            }
          }

          return res.status(200).json({ message: `${sharedCount} shares completed successfully!` });
        } catch (err) {
          console.error('Playwright error:', err);
          return res.status(500).json({ error: 'Automation failed' });
        } finally {
          if (browser) await browser.close();
        }
      } catch (err) {
        console.error('General error:', err);
        return res.status(500).json({ error: 'Server error' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  });
}
