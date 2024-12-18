const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Route to handle spamshare request
app.post("/spamshare", async (req, res) => {
  const { fbLink, fbCookies, interval, shareCount } = req.body;

  if (!fbLink || !fbCookies || !interval || !shareCount) {
    return res.status(400).send({ error: "Missing required fields." });
  }

  try {
    // Launch Puppeteer and navigate to Facebook
    const browser = await puppeteer.launch({
      headless: false,  // Set to true to run headlessly
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // Set the cookies for Facebook login
    await page.setCookie(...fbCookies);

    // Navigate to the provided Facebook link (ensure it's a valid post)
    await page.goto(fbLink, { waitUntil: "domcontentloaded" });

    let sharedCount = 0;
    while (sharedCount < shareCount) {
      // Click on the share button
      await page.waitForSelector('div[data-testid="share_button"]', { timeout: 5000 });
      await page.click('div[data-testid="share_button"]');

      // Wait for the modal to load and click on the share button again
      await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 5000 });
      await page.click('button[data-testid="share_dialog_button"]');

      sharedCount++;
      console.log(`Shared ${sharedCount} time(s)`);

      // Wait for the specified interval
      await page.waitForTimeout(interval * 1000); // Convert seconds to milliseconds
    }

    await browser.close();
    res.send({ message: `Successfully shared the post ${sharedCount} times.` });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "An error occurred while trying to share the post." });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
