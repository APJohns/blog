---
title: 'Measuring page weight'
description: 'How to accurately determine the sizes of files needed to render a web page.'
pubDate: 'Dec 17 2024 EDT'
tags: ['Sustainability', 'Wicked Green Web', 'Backend']
featured: true
---

I’m working on a web sustainability project called [Wicked Green Web](https://www.wickedgreenweb.dev/) that measures the estimated emissions of a page. The primary metric used in this calculation is page weight. <dfn>Page weight</dfn> is the size, as transferred over the network, of the files needed to render a web page. You can then use a model to estimate grams of CO<sub>2</sub> emitted per page visit. You can learn more on my [how it works](https://www.wickedgreenweb.dev/how-it-works) page. However, getting the file size of a web page turned out to be a lot more challenging than expected.

## How do we find all the files we need?

The solution to this turned out to be a lot less clear than I thought it would be. At first, I was trying to think of ways to parse the HTML file and figure out what other files I would need. But this would be tricky; I could easily miss something, and this is just what browsers do. I quickly realized that to get the most accurate value, I would need to load the page in a browser. So this leaves us with [Puppeteer](https://pptr.dev/) and [Playwright](https://playwright.dev/). I went with Puppeteer.

This presents another problem. If you open the network panel in your devtools, you’ll notice that different browsers will give you different results. I went with Chrome since it has the most market share and exposes some tools that will be helpful later. You’ll also notice that different viewport sizes will give you different results. The page is loading different assets depending on viewport size, e.g., different-sized images in a srcset.

Then we have to decide to leave the cache on or turn it off. After seeing how this behaves in the network panel, I opted to leave the cache on. I noticed that if a page was fetching an asset multiple times (e.g. an image used in multiple places), it was making multiple requests instead of caching the first one. Leaving the cache on was more true to how someone typically browses the web and gave a more accurate value.

## How do we get the actual file sizes?

While I was looking into this, I noticed most people who were trying to do this were using Lighthouse. There is a [Lighthouse npm package](https://www.npmjs.com/package/lighthouse) that can generate a Lighthouse report, and part of that report contains transfer sizes. This worked well, but I had a few problems with it.

1. Performance issues.
2. The values weren’t always matching up to the networks tab.

It took a while to generate the Lighthouse reports, and you couldn’t run multiple at once. This meant if I ended up with overlapping requests, they would error out. I was willing to work around this, but I wasn’t even getting the total file sizes I wanted; they were often higher than reality. I suspect caching is disabled.

Another approach would be to intercept requests in Puppeteer and look at the `Content-length` headers of each file. This proved to be inconsistent, with some files not having the header set. I wanted something more robust.

### The solution: CDPSession

I went with monitoring network requests using the Chrome Devtools Protocol ([CDPSession](https://pptr.dev/api/puppeteer.cdpsession)). The requests have an `encodedDataLength` property that gives us the value we’re looking for. This got me pretty close to what the devtools were reporting in terms of number of requests and total transfer size. It was also so much faster and could be run in parallel.

The final code looks like this.

```typescript
import puppeteer from 'puppeteer';

export default async function getTransferSize(url: string) {
  let totalTransferSize = 0;
  // Create a headless incognito Puppeteer browser
  const browser = await puppeteer.launch({ headless: true, args: ['--incognito'] });
  try {
    // Setup the page
    const page = (await browser.pages())[0];
    await page.setViewport({ width: 1900, height: 1000 });

    // Enable network tracking to capture transfer sizes
    const client = await page.createCDPSession();
    await client.send('Network.enable');
    const onLoadingFinished = (data: { encodedDataLength: number }) => {
      if (data.encodedDataLength >= 0) {
        totalTransferSize += data.encodedDataLength;
      }
    };
    client.on('Network.loadingFinished', onLoadingFinished);

    try {
      // Navigate to the page and wait for network activity to finish
      await page.goto(url, { waitUntil: 'networkidle2' });
    } catch (e) {
      console.error(`Failed to load page: ${e}`);
    } finally {
      // Remove event listener and close the CDP session
      client.off('Network.loadingFinished', onLoadingFinished);
      await client.detach();
    }
  } catch (e) {
    console.error(`Error setting up Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
  return totalTransferSize;
}
```

You can learn more about how I set up Puppeteer in my blog post, [Wrangling Puppeteer's memory usage on the server](https://www.ashjohns.dev/blog/headless-puppeteer/).

Through this task, I've learned that page weight is not an exact science. There are so many variables that create variance in the actual value. A lot of those variables come from the user, meaning there is no one true value for the weight of a page. For the sake of my project's needs, this solution gets me close enough to what an average user might see that I feel confident in moving forward with it.
