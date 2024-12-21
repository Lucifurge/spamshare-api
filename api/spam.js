const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { fbLink, shareCount, interval, cookies } = req.body;

    if (!fbLink || !shareCount || !interval || !cookies) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { fbLink, shareCount, interval, cookies } = req.body;

    if (!fbLink || !shareCount || !interval || !cookies) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (interval < 1 || interval > 60) {
      return res.status(400).json({ error: "Interval must be between 1 and 60 seconds" });
    }

    if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
      return res.status(400).json({ error: "Invalid cookies format" });
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: await chrome.executablePath,
        args: chrome.args,
        headless: chrome.headless,
      });
      const page = await browser.newPage();

      try {
        await page.setCookie(...cookies);
      } catch (cookieError) {
        console.error("Error setting cookies:", cookieError);
        return res.status(400).json({ error: "Invalid cookies format" });
      }

      console.log("Navigating to Facebook...");
      try {
        await page.goto(fbLink, { waitUntil: "domcontentloaded" });
      } catch (navigationError) {
        console.error("Failed to load Facebook post:", navigationError);
        return res.status(500).json({ error: "Failed to load Facebook post." });
      }

      let sharedCount = 0;
      while (sharedCount < shareCount) {
        try {
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
      res.status(200).json({ message: `${sharedCount} shares completed successfully!` });
    } catch (error) {
      console.error("Error with the Puppeteer automation:", error);
      res.status(500).json({ error: "Failed
    if (interval < 1 || interval > 60) {
      return res.status(400).json({ error: "Interval must be between 1 and 60 seconds" });
    }

    if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
      return res.status(400).json({ error: "Invalid cookies format" });
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: await chrome.executablePath,
        args: chrome.args,
        headless: chrome.headless,
      });
      const page = await browser.newPage();

      try {
        await page.setCookie(...cookies);
      } catch (cookieError) {
        console.error("Error setting cookies:", cookieError);
        return res.status(400).json({ error: "Invalid cookies format" });
      }

      console.log("Navigating to Facebook...");
      try {
        await page.goto(fbLink, { waitUntil: "domcontentloaded" });
      } catch (navigationError) {
        console.error("Failed to load Facebook post:", navigationError);
        return res.status(500).json({ error: "Failed to load Facebook post." });
      }

      let sharedCount = 0;
      while (sharedCount < shareCount) {
        try {
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
      res.status(200).json({ message: `${sharedCount} shares completed successfully!` });
    } catch (error) {
      console.error("Error with the Puppeteer automation:", error);
      res.status(500).json({ error: "Failed to perform automated sharing." });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
