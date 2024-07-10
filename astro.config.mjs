import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.ashjohns.dev',
	integrations: [mdx(), sitemap()],
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
