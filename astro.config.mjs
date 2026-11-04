// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import keystatic from '@keystatic/astro';
import starlightSidebarTopics from 'starlight-sidebar-topics';

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
			// No "Edit page" link on the user guides (they are edited in Keystatic);
			// pages synced from odysseyarm/odyssey set their own editUrl.
			// Long code lines wrap instead of scrolling out of view.
			expressiveCode: { defaultProps: { wrap: true } },
			// Two separate sets of docs, each with its own sidebar: guides for people
			// using Odyssey, and developer docs synced from odysseyarm/odyssey
			// (scripts/sync-docs.mjs). The header menu links to both; neither
			// sidebar shows the other.
			plugins: [
				starlightSidebarTopics([
					{
						id: 'docs',
						label: 'Using Odyssey',
						link: '/docs/',
						icon: 'open-book',
						items: [{ label: 'Guides', items: [{ autogenerate: { directory: 'docs/guides' } }] }],
					},
					{
						id: 'developers',
						label: 'Developers',
						link: '/developers/',
						icon: 'seti:code-search',
						items: [{ autogenerate: { directory: 'developers' } }],
					},
				]),
			],
			components: {
				// Adds the site menu and announcement banner above the docs.
				SocialIcons: './src/components/starlight/SocialIcons.astro',
				Banner: './src/components/starlight/Banner.astro',
				// One sidebar per set of docs, titled, without a list of the others.
				Sidebar: './src/components/starlight/Sidebar.astro',
			},
		}),
		react(),
		keystaticDev,
	],
});
