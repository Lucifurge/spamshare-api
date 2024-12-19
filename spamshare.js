const puppeteer = require("puppeteer");

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { fbLink, shareCount, interval } = req.body;

    if (!fbLink || !shareCount || !interval) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    let browser;

    try {
        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        console.log("Navigating to Facebook...");
        await page.goto(fbLink, { waitUntil: "domcontentloaded" }).catch(err => {
            console.error("Failed to load Facebook post:", err);
            throw new Error("Failed to load Facebook post.");
        });

        let sharedCount = 0;
        while (sharedCount < shareCount) {
            try {
                await page.waitForSelector('div[data-testid="share_button"]', { timeout: 5000 });
                await page.click('div[data-testid="share_button"]');

                await page.waitForSelector('button[data-testid="share_dialog_button"]', { timeout: 5000 });
                await page.click('button[data-testid="share_dialog_button"]');

                sharedCount++;
                console.log(`Shared ${sharedCount} time(s)`);

                // Add a randomized wait time
                const randomizedInterval = interval + Math.floor(Math.random() * 2); // Adding some randomness
                await page.waitForTimeout(randomizedInterval * 1000);
            } catch (error) {
                console.error("Error while sharing:", error);
                throw new Error("Error during share operation.");
            }
        }

        console.log("Sharing completed successfully!");
        res.status(200).json({ success: true, message: `${sharedCount} shares completed.` });
    } catch (error) {
        console.error("Unhandled error:", error);
        res.status(500).json({ error: error.message || "An unexpected error occurred." });
    } finally {
        if (browser) {
            console.log("Closing browser...");
            await browser.close();
        }
    }
}
