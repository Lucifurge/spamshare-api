const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");

export async function POST(request) {
  try {
    const { fbLink, shareCount, interval, cookies } = await request.json();
    console.log("Request body received:", { fbLink, shareCount, interval, cookies });

    // Validate inputs
    if (!fbLink || !shareCount || !interval || !cookies) {
      console.error("Missing required parameters");
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    if (interval < 1 || interval > 60) {
      console.error("Invalid interval:", interval);
      return new Response(JSON.stringify({ error: "Interval must be between 1 and 60 seconds" }), { status: 400 });
    }

    if (!Array.isArray(cookies) || cookies.some(cookie => typeof cookie.name !== 'string' || typeof cookie.value !== 'string')) {
      console.error("Invalid cookies format:", cookies);
      return new Response(JSON.stringify({ error: "Invalid cookies format" }), { status: 400 });
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

      console.log("Setting cookies...");
      try {
        await page.setCookie(...cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: 'facebook.com',
        })));
      } catch (cookieError) {
        console.error("Error setting cookies:", cookieError);
        return new Response(JSON.stringify({ error: "Invalid cookies format" }), { status: 400 });
      }

      console.log("Navigating to Facebook:", fbLink);
      try {
        await page.goto(fbLink, { waitUntil: "domcontentloaded" });
      } catch (navigationError) {
        console.error("Failed to load Facebook post:", navigationError);
        return new Response(JSON.stringify({ error: "Failed to load Facebook post." }), { status: 500 });
      }

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
      return new Response(JSON.stringify({ message: `${sharedCount} shares completed successfully!` }), { status: 200 });

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error("Error in POST request:", error);
    return new Response(JSON.stringify({ error: "Failed to perform automated sharing." }), { status: 500 });
  }
}
