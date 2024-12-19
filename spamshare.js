const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// POST route to start the sharing process
app.post("/api/share", async (req, res) => {
  const { fbLink, shareCount, interval, cookies } = req.body;

  if (!fbLink || !shareCount || !interval || !cookies) {
    return res.status(400).send({ error: "Missing required parameters" });
  }

  // Start the browser and the sharing process
  try {
    const browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode (no UI)
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set cookies for the Facebook session
    await page.setCookie(...cookies);

    console.log("Navigating to Facebook...");
    await page.goto(fbLink, { waitUntil: "domcontentloaded" }).catch(err => {
      console.error("Failed to load Facebook post:", err);
      res.status(500).send({ error: "Failed to load Facebook post." });
      return;
    });

    let sharedCount = 0;
    while (sharedCount < shareCount) {
      try {
        // Wait for the share button and click it
        await page.waitForSelector('div[data-testid="share_button"]', { timeout: 5000 });
        await page.click('div[data-testid="share_button"]');

        // Wait for the share dialog and click the confirm button
        await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 5000 });
        await page.click('button[data-testid="share_dialog_button"]');

        sharedCount++;
        console.log(`Shared ${sharedCount} time(s)`);

        // Add a randomized wait time between shares
        const randomizedInterval = interval + Math.floor(Math.random() * 2); // Randomize a bit
        await page.waitForTimeout(randomizedInterval * 1000);
      } catch (error) {
        console.error("Error while sharing:", error);
        res.status(500).send({ error: "Error during share operation." });
        return;
      }
    }

    console.log("All shares completed!");
    res.status(200).send({ message: `${shareCount} shares completed successfully!` });
    await browser.close();
  } catch (error) {
    console.error("Error with the Puppeteer automation:", error);
    res.status(500).send({ error: "Failed to perform automated sharing." });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
