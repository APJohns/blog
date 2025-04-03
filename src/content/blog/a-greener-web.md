---
title: 'A Greener Web: Building a Dashboard with React and Netlify'
description: 'The first step to a greener web. Follow along as I build out a web sustainability dashboard using React and Netlify.'
pubDate: 'Jul 1 2024 EST'
tags: ['Sustainability']
---

When we think of sustainability efforts, we picture electric cars, recycling, and reusable water bottles. But we often don’t think of the impact our digital presence has. In fact, the internet accounts for around 4% of global carbon emissions. Thats about the same as the entire aviation industry!

There are lots of ways to reduce the impact of our websites. I’ve linked to some great articles that dive into details at the bottom of this post. But a key part of going on this web sustainability journey is understanding where we are now, so we can see how far we’ve come. I’m talking metrics! Theres nothing we developers like more than optimizing our code to get that higher score. Even making small improvements can compound across all your users. So lets gamify this and make our little corner of the web a better place.

## Context

During my time on Boston Scientific’s Design System team, we took on this challenge. We wanted to be aware of the impact our projects had towards web sustainability. So we began by taking a look at our documentation site. The site is built with React, and hosted on Netlify.

### Prerequisites Knowledge

This article is written with some understanding of React and Netlify assumed.

## The Plan

This all began when we came across [Website Carbon Calculator](https://www.websitecarbon.com). They have a badge you can add to your website to show the estimated grams of CO<sub>2</sub> used per visit. We used this for a while but want to take it a step further to see how those numbers changed over time as our site grew, and to include it as one of our metrics. So we set out to create a dashboard showing just that.

1. Collect the emissions data of each of our pages using an API and Netlify Functions
2. Store that data in MongoDB
3. Summarize findings in a dashboard.

## Collect the Data

Website Carbon Calculator offers an API where you can pass it a URL, and get back emissions data. We needed to pass each of our pages to this API, and save the results. This comes with a few problems to solve for a JAMStack site. How do we get all the URLs we need, where do we make those API calls, and where do we store that data? The solutions are sitemap, Netlify Functions, and MongoDB respectively.

Before we start writing any code, we should setup a [MongoDB Atlas](https://www.mongodb.com/atlas) database. Their Getting Started with Atlas documentation will set you up withe everything you will need.

Lets start with creating a file in our React app called `netlify/functions/collectCarbon.mts`. We’re going to be using [Netlify’s Lambda API surface](https://docs.netlify.com/functions/get-started/#lambda-compatibility).

So lets first grab our sitemap, and pull the urls from the `<loc>` elements and return them as an array.

```typescript
// netlify/functions/collectCarbon.mts

/**
 * Gets the sitemap from the main branch in the anatomy-docs github
 * @returns Promise<string[]> A string of urls parsed from the sitemap
 */
async function parseSitemap(): Promise<string[] | null> {
  console.log('Parsing sitemap...');
  try {
    const res = await axios.get('https://raw.githubusercontent.com/bos-sci/anatomy-docs/main/public/sitemap.xml');
    const dom = new jsdom.JSDOM(res.data, { contentType: 'application/xml' });
    return Array.from(dom.window.document.querySelectorAll('loc'), (loc: Element) => loc.textContent || '');
  } catch (error) {
    console.error(error);
    return null;
  }
}
```

We also need a function that passes a URL to the API and returns the data from the response along with the URL itself and the date.

```typescript
// netlify/functions/collectCarbon.mts

async function getCarbon(url: string, date: string): Promise<CarbonEntry> {
  const api = 'https://api.websitecarbon.com/b?url=';
  try {
    const res = await axios.get(api + url);
    return {
      date,
      url,
      carbon: res.data.c,
      percent: res.data.p,
    };
  } catch (error) {
    console.error(error);
    return {
      date,
      url,
      carbon: -1,
      percent: -1,
      error: {
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  }
}
```

We're including the date, url, grams of carbon, and percent compared across other sites in our data here. If something goes wrong, we're setting carbon and percent to -1 since those values can never be negative allowing us to take those values into account when working with the data.

Then we tie these together by iterating over the sitemap URLs and return an array of carbon data ready to get inserted to the database.

```typescript
// netlify/functions/collectCarbon.mts

/**
 * Passes all the sitemap urls into the website carbon api
 * @returns Promise<CarbonEntry[]> Records to be written to DB
 */
async function collectData(): Promise<CarbonEntry[] | null> {
  console.log('Collecting data...');
  const date = new Date().toISOString();
  const urls = await parseSitemap();
  console.log('Sitemap parsed');
  if (urls) {
    const filteredUrls = urls.map((url) => url.replace(/\/$/m, ''));
    const promises = filteredUrls.map((url) => getCarbon(url, date));
    return Array.from(await Promise.all(promises));
  } else {
    return null;
  }
}
```

Finally we connect to the MongoDB and insert the data. For this you will also need you connection uri, which we are pulling in from environment variables here.

```typescript
// netlify/functions/collectCarbon.mts

/**
 * Connects to MongoDB and inserts records
 * @returns Status code object
 */
const handler: Handler = async () => {
  const uri = process.env.MONGO_CONNECTION as string;
  const client = new MongoClient(uri);

  try {
    const database = client.db('carbon-metrics');
    const carbon = database.collection<CarbonEntry>('metrics');
    const carbonData = await collectData();
    console.log('Collected data');
    if (carbonData) {
      console.log('Inserting into DB...');
      const insertResult = await carbon.insertMany(carbonData);
      console.log(`Inserted ${insertResult.insertedCount} records into DB`);
      return {
        statusCode: 200,
      };
    } else {
      return {
        statusCode: 500,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
    };
  } finally {
    await client.close();
  }
};
```

The data is structured such that each record in the database is the carbon data for a single url on a single date. This allowed for flexibility in how we aggregate the data later. Instead of grouping by date or by url in the database, we can handle that in code and keep the data simple and unopinionated.

The collectCarbon file should now look like this.

```typescript
// netlify/functions/collectCarbon.mts

import { MongoClient } from 'mongodb';
import { Handler } from '@netlify/functions';
import { CarbonEntry } from '../../src/shared/types/docs';
const { default: axios } = require('axios');
const jsdom = require('jsdom');

/**
 * Query the website carbon api and return a CarbonEntry with date, url, carbon grams, and percent data.
 * @param url Anatomy docs page url
 * @param date Date string for the current date
 * @returns Promise<CarbonEntry>
 */
async function getCarbon(url: string, date: string): Promise<CarbonEntry> {
  const api = 'https://api.websitecarbon.com/b?url=';
  try {
    const res = await axios.get(api + url);
    return {
      date,
      url,
      carbon: res.data.c,
      percent: res.data.p,
    };
  } catch (error) {
    console.error(error);
    return {
      date,
      url,
      carbon: -1,
      percent: -1,
      error: {
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  }
}

/**
 * Gets the sitemap from the main branch in the anatomy-docs github
 * @returns Promise<string[]> A string of urls parsed from the sitemap
 */
async function parseSitemap(): Promise<string[] | null> {
  console.log('Parsing sitemap...');
  try {
    const res = await axios.get('https://raw.githubusercontent.com/bos-sci/anatomy-docs/main/public/sitemap.xml');
    const dom = new jsdom.JSDOM(res.data, { contentType: 'application/xml' });
    return Array.from(dom.window.document.querySelectorAll('loc'), (loc: Element) => loc.textContent || '');
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Passes all the sitemap urls into the website carbon api
 * @returns Promise<CarbonEntry[]> Records to be written to DB
 */
async function collectData(): Promise<CarbonEntry[] | null> {
  console.log('Collecting data...');
  const date = new Date().toISOString();
  const urls = await parseSitemap();
  console.log('Sitemap parsed');
  if (urls) {
    const filteredUrls = urls.map((url) => url.replace(/\/$/m, ''));
    const promises = filteredUrls.map((url) => getCarbon(url, date));
    return Array.from(await Promise.all(promises));
  } else {
    return null;
  }
}

/**
 * Connects to MongoDB and inserts records
 * @returns Status code object
 */
const handler: Handler = async () => {
  const uri = process.env.MONGO_CONNECTION as string;
  const client = new MongoClient(uri);

  try {
    const database = client.db('carbon-metrics');
    const carbon = database.collection<CarbonEntry>('metrics');
    const carbonData = await collectData();
    console.log('Collected data');
    if (carbonData) {
      console.log('Inserting into DB...');
      const insertResult = await carbon.insertMany(carbonData);
      console.log(`Inserted ${insertResult.insertedCount} records into DB`);
      return {
        statusCode: 200,
      };
    } else {
      return {
        statusCode: 500,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
    };
  } finally {
    await client.close();
  }
};

export { handler };
```

We created some types which you will need to include if you are using typescript.

```typescript
export interface CarbonEntry {
  date: string;
  url: string;
  carbon: number;
  percent: number;
  error?: {
    status: string;
    statusText: string;
  };
}

export interface CarbonRecord extends CarbonEntry {
  _id: string;
}
```

So this collects our data, but how do we automate it? Netlify comes to the rescue again with function schedules. We can specify a cron schedule for the function in our netlify.toml file.

```toml
[functions]
  [functions."collectCarbon"]
    external_node_modules = ["jsdom"]
    schedule = "0 0 * * 1"
```

We also need to add jsdom as an external dependency here. If you’re unfamiliar with the cron syntax, crontab guru is a really great tool, and Netlify has some [documentation](https://docs.netlify.com/functions/scheduled-functions/) on their schedule functions too.

We can run and test these functions locally using the Netlify CLI. Since we won’t have much data to work with yet, you might want to run it a few times manually.

## Show the Data

Now that we have some data, we need to be able to show it in some meaningful way. We’ll first write a couple more Netlify Functions that query our data from MongoDB.

One to get all the records.

```typescript
// netlify/functions/getAllCarbon.mts

import { MongoClient } from 'mongodb';
import { CarbonRecord } from '../../src/shared/types/docs';

export default async () => {
  const uri = process.env.MONGO_CONNECTION as string;
  const client = new MongoClient(uri);
  try {
    const database = client.db('carbon-metrics');
    const carbon = database.collection<CarbonRecord>('metrics');
    const cursor = carbon.find().sort({ date: 1 }); // Sort date ascending
    const allData = await cursor.toArray();
    return Response.json(allData);
  } catch (error) {
    return Response.json(error);
  } finally {
    client.close();
  }
};
```

And another to get a specific record by passing in search parameters.

```typescript
// netlify/functions/getCarbon.mts

import { MongoClient } from 'mongodb';
import { CarbonRecord } from '../../src/shared/types/docs';
import { URL } from 'url';

export default async (req: Request) => {
  // Build the search params object from query parameters
  const params = {};
  new URL(req.url).searchParams.forEach((value, key) => (params[key] = value));
  // Connect to MongoDB
  const uri = process.env.MONGO_CONNECTION as string;
  const client = new MongoClient(uri);
  try {
    const database = client.db('carbon-metrics');
    const carbon = database.collection<CarbonRecord>('metrics');
    const cursor = carbon.find(params).sort({ date: 1 }); // Sort date ascending
    const allData = await cursor.toArray();
    return Response.json(allData);
  } catch (error) {
    return Response.json(error);
  } finally {
    client.close();
  }
};
```

We can make fetch requests from within our app to these functions and they should return what we need.

```typescript
const res = await fetch('/.netlify/functions/getAllCarbon');
```

```typescript
// Filter by date
const res = await fetch(`/.netlify/functions/getCarbon?date=2024-07-01`);
// Filter by url
const res = await fetch(`/.netlify/functions/getCarbon?url=https://www.mydomain.com/foo/bar`);
```

We can use these to build out a dashboard. Here are some examples of what we did with out data.

- Spark chart with date on the x axis and site-wide average carbon on the y axis.
- Grams and percent changed since the previous run.
- Table of carbon and percent for the most recent run.
- Table of carbon and percent over time for a page.

Unfortunately I can't link out to the dashboard or its code. I plan to rebuild this dashboard for another project of mine, so stay tuned for a more in-depth post with details on the dashboard and taking advantage of some new features offered by the Website Carbon API.

## Conclusion

Web sustainability is important in today's day and age. Adding it to the metrics we track is the first step to a greener web. And it doesn't hurt that the same changes that make our sites greener, also happen to improve performance!

Feel free to reach out to me on [LinkedIn](https://www.linkedin.com/in/ashley-p-johns) or [Threads](https://www.threads.net/@ashpjohns) if you have any questions, or any other green tips!

## Helpful Resources

- https://www.websitecarbon.com
- https://www.mongodb.com/atlas
- https://docs.netlify.com/functions/get-started/?fn-language=ts
- https://www.w3.org/blog/2023/introducing-web-sustainability-guidelines
- https://developer.mozilla.org/en-US/blog/introduction-to-web-sustainability

## Sources

- https://sustainablewebdesign.org/estimating-digital-emissions
