const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/share", async (req, res) => {
  const { fbLink, shareCount, interval, cookies } = req.body;

  if (!fbLink || !shareCount || !interval || !cookies) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: await chrome.executablePath,
      args: chrome.args,
      headless: chrome.headless,
    });
    const page = await browser.newPage();

    await page.setCookie(...cookies);

    console.log("Navigating to Facebook...");
    await page.goto(fbLink, { waitUntil: "domcontentloaded" }).catch(async (err) => {
      console.error("Failed to load Facebook post:", err);
      await browser.close();
      return res.status(500).json({ error: "Failed to load Facebook post." });
    });

    let sharedCount = 0;
    while (sharedCount < shareCount) {
      try {
        await page.waitForSelector('div[data-testid="share_button"]', { timeout: 10000 });
        await page.click('div[data-testid="share_button"]');

        await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 10000 });
        await page.click('button[data-testid="share_dialog_button"]');

        sharedCount++;
        console.log(`Shared ${sharedCount} time(s)`);

        const randomizedInterval = interval + Math.floor(Math.random() * 2);
        await page.waitForTimeout(randomizedInterval * 1000);
      } catch (error) {
        console.error("Error while sharing:", error);
        await browser.close();
        return res.status(500).json({ error: "Error during share operation." });
      }
    }

    console.log("All shares completed!");
    res.status(200).json({ message: `${shareCount} shares completed successfully!` });
    await browser.close();
  } catch (error) {
    console.error("Error with the Puppeteer automation:", error);
    res.status(500).json({ error: "Failed to perform automated sharing." });
  }
});

module.exports = app;
