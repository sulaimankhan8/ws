import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors({
  origin: "https://your-frontend.vercel.app", // Replace with your frontend URL
  credentials: true,
}));
app.use(express.json());

// Hardcoded Instagram credentials (not recommended for production)
const username = "lung30001"; // Replace with your Instagram username
const password = "8318683295!"; // Replace with your Instagram password

app.post("/scrape", async (req, res) => {
  const { url, option } = req.body;

  if (!url || !option) {
    return res.status(400).json({ success: false, error: "URL and option are required." });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" });
    await page.type('input[name="username"]', username, { delay: 100 });
    await page.type('input[name="password"]', password, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle2" });

    let data = [];
    if (option === "followers") {
      console.log("Scraping followers...");
      await page.click('a[href*="/followers/"]');
      await page.waitForSelector('div[role="dialog"]');

      // Scroll to load followers
      let previousHeight;
      while (true) {
        const currentHeight = await page.evaluate(() => {
          return document.querySelector('div[role="dialog"]').scrollHeight;
        });

        if (previousHeight === currentHeight) {
          break; // No more followers to load
        }
        previousHeight = currentHeight;

        // Scroll down
        await page.evaluate(() => {
          document.querySelector('div[role="dialog"]').scrollTop = document.querySelector('div[role="dialog"]').scrollHeight;
        });

        // Use setTimeout equivalent with a promise for delay
        await page.evaluate(() => {
          return new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
        });
      }

      // Extract follower usernames
      const followers = await page.evaluate(() => {
        const elements = document.querySelectorAll('div[role="dialog"] a');
        return Array.from(elements).map((el) => el.href.split('/')[3]);
      });
      data = followers;
    }
    else if (option === "comments") {
      console.log("Scraping comments...");

      // Wait for the comments section to load
      await page.waitForSelector('a[href^="/"]');

      // Extract commenters' usernames from href attributes
      const commenters = await page.evaluate(() => {
        const usernames = [];
        const commentLinks = document.querySelectorAll('a[href^="/"]'); // Select all <a> tags with href starting with "/"
        commentLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !href.startsWith('/p/')) { // Filter out non-username links
            const username = href.split('/')[1]; // Extract the username from the href
            usernames.push(username);
          }
        });
        return usernames;
      });

      data = commenters;
    }
    else if (option === "likes") {
      console.log("Scraping likes...");

      try {
        // Wait for the "Likes" button to appear
        await page.waitForSelector('section span[role="button"], a[href*="/liked_by/"]', { timeout: 5000 });

        // Click the "Likes" button to open the modal
        await page.click('section span[role="button"], a[href*="/liked_by/"]');
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });

        // Scroll to load all users who liked the post
        let previousHeight = 0;
        let currentHeight = 0;
        let attempts = 0;
        const maxAttempts = 10; // Maximum number of scroll attempts

        while (attempts < maxAttempts) {
          // Get the current scroll height of the modal
          currentHeight = await page.evaluate(() => {
            const modal = document.querySelector('div[role="dialog"]');
            return modal ? modal.scrollHeight : 0;
          });

          // If no more users are loaded, break the loop
          if (currentHeight === previousHeight) {
            break;
          }

          // Scroll down to load more users
          await page.evaluate(() => {
            const modal = document.querySelector('div[role="dialog"]');
            if (modal) {
              modal.scrollTop = modal.scrollHeight;
            }
          });

          // Wait for new users to load (using setTimeout in the browser context)
          await page.evaluate(() => {
            return new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds delay
          });

          // Update the previous height
          previousHeight = currentHeight;
          attempts++;
        }

        // Extract usernames of users who liked the post
        const likers = await page.evaluate(() => {
          const elements = document.querySelectorAll('div[role="dialog"] a[href^="/"]'); // Select all <a> tags in the modal
          const usernames = new Set(); // Use a Set to avoid duplicates
          elements.forEach((el) => {
            const href = el.getAttribute('href');
            if (href && !href.startsWith('/p/')) { // Filter out non-username links
              const username = href.split('/')[1]; // Extract the username
              usernames.add(username);
            }
          });
          return Array.from(usernames); // Convert Set to array
        });

        data = likers;
      } catch (error) {
        console.error("Error scraping likes:", error.message);
        data = [];
      }
    }
    else {
      throw new Error("Invalid option.");
    }

    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Scraping failed:", error.message);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});