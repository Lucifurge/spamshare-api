console.log("Navigating to Facebook...");
await page.goto(fbLink, { waitUntil: "domcontentloaded" }).catch(err => {
  console.error("Failed to load Facebook post:", err);
  res.status(500).send({ error: "Failed to load Facebook post." });
  return;
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
    res.status(500).send({ error: "Error during share operation." });
    return;
  }
}

