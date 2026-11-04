// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import keystatic from '@keystatic/astro';

// Keystatic's own integration adds server routes that edit files on disk. Use
// it only for `astro dev`; the built site is fully static and the editor at
// /keystatic (src/pages/keystatic/index.astro) talks to Keystatic Cloud.
/** @type {import('astro').AstroIntegration} */
const keystaticDev = {
	name: 'keystatic-dev',
	hooks: {
		'astro:config:setup': (options) => {
			if (options.command === 'dev') keystatic().hooks['astro:config:setup']?.(options);
		},
	},
};

export default defineConfig({
	site: 'https://odysseyarm.com',
	integrations: [
		starlight({
			title: 'Odyssey Arm',
			logo: {
				light: './src/assets/images/logo-dark.png',
				dark: './src/assets/images/logo-white.png',
				replacesTitle: true,
			},
			favicon: '/favicon.ico',
			customCss: ['./src/styles/tokens.css', './src/styles/docs.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/odysseyarm/odyssey' },
			],
			// Pages synced from odysseyarm/odyssey set their own editUrl.
			editLink: {
				baseUrl: 'https://github.com/odysseyarm/odysseyarm.github.io/edit/gh-pages/',
			},
			sidebar: [
				{ label: 'Using Odyssey', items: [{ autogenerate: { directory: 'docs/guides' } }] },
				{ label: 'Client SDK', items: [{ autogenerate: { directory: 'docs/sdk' } }] },
				{ label: 'Contributing', items: [{ autogenerate: { directory: 'docs/contributing' } }] },
			],
			components: {
				// Adds the site menu and announcement banner above the docs.
				SocialIcons: './src/components/starlight/SocialIcons.astro',
				Banner: './src/components/starlight/Banner.astro',
			},
		}),
		react(),
		keystaticDev,
	],
});
