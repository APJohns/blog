import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

import { remarkReadingTime } from './plugins/remark-reading-time.mjs';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.ashjohns.dev',
  integrations: [mdx(), sitemap(), svelte(), react()],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  markdown: { remarkPlugins: [remarkReadingTime] },
});