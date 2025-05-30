import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

export const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.string().array(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updateDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    featured: z.boolean().optional(),
  }),
});

export const notes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/notes' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    name: z.string(),
    tags: z.string().array().optional(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updateDate: z.coerce.date(),
    contributors: z.string().array(),
  }),
});

export const collections = { blog, notes };
