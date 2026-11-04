import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	// Everything under /docs, rendered by Starlight. guides/ is edited in
	// Keystatic; sdk/ and contributing/ are copied from odysseyarm/odyssey.
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),

	// Blog posts, edited in Keystatic (keystatic.config.ts → collections.blog).
	blog: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
		schema: ({ image }) =>
			z.object({
				title: z.string(),
				date: z.coerce.date(),
				author: z.string().nullish(),
				summary: z.string().nullish(),
				cover: image().nullish(),
				coverAlt: z.string().nullish(),
				draft: z.boolean().default(false),
			}),
	}),
};
