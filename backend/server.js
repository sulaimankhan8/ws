const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.post("/scrape", async (req, res) => {
  const { url, option } = req.body;

  if (!url || !option) {
    return res.status(400).json({ success: false, error: "URL and option are required." });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, 
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
    });

    // Navigate to Instagram and log in
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" });
    await page.type('input[name="username"]', "lung30001", { delay: 100 }); // Replace with your username
    await page.type('input[name="password"]', "8318683295!", { delay: 100 }); // Replace with your password
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
        let previousHeight;
        while (true) {
          const currentHeight = await page.evaluate(() => {
            return document.querySelector('div[role="dialog"]').scrollHeight;
          });
    
          if (previousHeight === currentHeight) {
            break; // No more users to load
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
    
        // Extract usernames of users who liked the post
        const likers = await page.evaluate(() => {
          const elements = document.querySelectorAll('div[role="dialog"] a[href^="/"]'); // Select all <a> tags in the modal
          const usernames = [];
          elements.forEach((el) => {
            const href = el.getAttribute('href');
            if (href && !href.startsWith('/p/')) { // Filter out non-username links
              const username = href.split('/')[1]; // Extract the username
              usernames.push(username);
            }
          });
          return usernames;
        });
        data = likers;
      } catch (error) {
        console.error("Error scraping likes:", error.message);
        data = []; // Return an empty array if the "Likes" button is not found
      }
    }
    else {
      throw new Error("Invalid option.");
    }

    await browser.close();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Scraping failed:", error.message);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});