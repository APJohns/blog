---
title: "Wrangling Puppeteer's memory usage on the server"
description: 'My fight to reduce memory usage when running Puppeteer server-side.'
pubDate: 'Dec 9 2024'
---

I’m working on a web sustainability dashboard to measure the carbon footprint of my web applications. The primary metric used is file transfer sizes. The best way to accurately get this value is to load the page in Puppeteer. But when you’re trying to run this affordably on a server with 512MB of RAM, every byte of memory usage counts. So how do we run Chrome on the server while using as little memory as possible?

Most documentation and guides out there have you create a browser, and then a page on that browser, then navigate with that page.

```typescript
// Launch the browser and open a new blank page
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Navigate the page to a URL
await page.goto('https://example.com/');
```

This works, but we can do better. Here is what we get, I've set headless to false so we can take a look at what Chrome is doing.

![Screenshot of chrome with 2 tabs where one of the tabs is an empty page and the other is example.com](@/images/puppeteer1.png)

Notice that we have 2 tabs created. Let’s start by making these tabs incognito. We can accomplish this by adding the `--incognito` flag. This should hopefully reduce the amount of saved and cached data when we visit sites and clean up more of that data on the close of the browser.

```typescript
// Launch the browser and open a new blank page
const browser = await puppeteer.launch({ args: ['--incognito'] });
const page = await browser.newPage();

// Navigate the page to a URL
await page.goto('https://example.com/');
```

![Screenshot of chrome with 2 windows each with 1 tab. One window has an empty page in incognito, the other has example.com but not incognito](@/images/puppeteer2.png)

Weird, now we have 2 windows, and only one of them is incognito. And the page we actually care about is the one that isn't incognito.

## The solution

Okay, now that we've diagnosed what's going on when we run puppeteer, let's get our single incognito page working.

All we need to do is grab that page that is initially created on launch of the browser, and use that. We can fetch the pages using the `.pages()` method on the browser. This returns an array of pages, and we simply grab the first one.

```typescript
// Launch the browser in incognito
const browser = await puppeteer.launch({ headless: true, args: ['--incognito'] });
// Uses the existing page created from the browser launch
const page = (await browser.pages())[0];

// Navigate the page to a URL
await page.goto('https://example.com/');
```

![Screenshot of chrome with a single incognito page on example.com](@/images/puppeteer3.png)

Yay! Finally, a single window, with a single incognito tab.

After making this change, I saw my memory usage on the server get essentially cut in half per page crawl.

### Additional observations

#### Close the browser

We also need to make sure to close the browser. I've done this in a try...finally block to ensure the browser closes even if there is an error.

```typescript
const browser = await puppeteer.launch({ headless: false, args: ['--incognito'] });

// Run browser actions inside a try
try {
  const page = (await browser.pages())[0];
  await page.goto('https://example.com/');
} catch (e) {
  console.error(e);
} finally {
  // Close browser in a finally to ensure it closes even if something goes wrong in the browser actions
  await browser.close();
}
```

#### Run synchronously

If we need to visit multiple pages, we can either launch a bunch of browser or tabs, or run our tasks synchronously. I went with the latter. This approach takes longer, but the memory will only get as high as the largest site visited. Whereas with multiple tabs your memory usage will get quite high. Since my task was happening in the background, I didn't mind the increased runtime for the sake of reduced memory costs.

### Side note

I also noticed memory wasn't dropping back down all the way after visiting a page. After some testing, I believe Chrome is taking that memory, and not releasing it to the process in order to speed up the next run. I noticed that the total memory usage only peaked at the largest site loaded. In my case this works fine, considering I know I'll be using that memory for more page visit. My server is not holding steady in its memory usage.
