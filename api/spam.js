
const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// CORS Handling for All Origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.post("/share", async (req, res) => {
  const { fbLink, shareCount, interval, cookies } = req.body;

  // Check if required parameters are missing
  if (!fbLink || !shareCount || !interval || !cookies) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Validate interval (should be between 1 and 60 seconds)
  if (interval < 1 || interval > 60) {
    return res.status(400).json({ error: "Interval must be between 1 and 60 seconds" });
  }

  // Validate cookies format
  if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
    return res.status(400).json({ error: "Invalid cookies format" });
  }

  let browser;
  try {
    // Launch Puppeteer with AWS Lambda compatible configuration
    browser = await puppeteer.launch({
      executablePath: await chrome.executablePath,
      args: chrome.args,
      headless: chrome.headless,
    });
    const page = await browser.newPage();

    // Set cookies (fbstate)
    try {
      await page.setCookie(...cookies);  // Using the provided cookies (fbstate)
    } catch (cookieError) {
      console.error("Error setting cookies:", cookieError);
      return res.status(400).json({ error: "Invalid cookies format" });
    }

    // Navigate to the Facebook post
    console.log("Navigating to Facebook...");
    try {
      await page.goto(fbLink, { waitUntil: "domcontentloaded" });
    } catch (navigationError) {
      console.error("Failed to load Facebook post:", navigationError);
      return res.status(500).json({ error: "Failed to load Facebook post." });
    }

    let sharedCount = 0;
    // Loop to perform the share action multiple times
    while (sharedCount < shareCount) {
      try {
        // Share button logic
        await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
        await page.click('div[data-testid="share_button"]');

        // Confirm sharing
        await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
        await page.click('button[data-testid="share_dialog_button"]');

        sharedCount++;
        console.log(`Shared ${sharedCount} time(s)`);

        // Wait for the specified interval (in seconds)
        console.log(`Waiting for ${interval} seconds...`);
        await page.waitForTimeout(interval * 1000); // Delay in milliseconds
      } catch (shareError) {
        console.error(`Error during share operation at count ${sharedCount}:`, shareError);
        break; // Exit loop on failure to prevent infinite retries
      }
    }

    console.log("All shares completed!");
    res.status(200).json({ message: `${sharedCount} shares completed successfully!` });
  } catch (error) {
    console.error("Error with the Puppeteer automation:", error);
    res.status(500).json({ error: "Failed to perform automated sharing." });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

module.exports = app;
