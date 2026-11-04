// Keystatic is the editor at /keystatic. Every field below is something
// marketing can change without touching code. Saving writes the files listed in
// each `path` and commits them to GitHub (or to disk when running `npm run dev`).
//
// When you add a field here, also read it where the page renders it (see
// src/lib/site.ts for the singletons and src/content.config.ts for collections).
import { collection, config, fields, singleton } from '@keystatic/core';

// Images picked in the singletons (home page, etc.) land here. src/lib/images.ts
// turns the stored path back into an optimized image.
const uploadImage = (label: string, description?: string) =>
	fields.image({
		label,
		description,
		directory: 'src/assets/uploads',
		publicPath: '/src/assets/uploads/',
	});

const link = (label: string) =>
	fields.object(
		{
			label: fields.text({ label: 'Text' }),
			href: fields.text({ label: 'Link', description: 'A path such as /downloads or a full URL' }),
		},
		{ label, layout: [6, 6] },
	);

const markdownBody = (directory: string, publicPath: string) =>
	fields.markdoc({
		label: 'Content',
		extension: 'md',
		options: { image: { directory, publicPath } },
	});

export default config({
	// On the live site, editors sign in through Keystatic Cloud, which commits
	// their changes to odysseyarm/odysseyarm.github.io. `npm run dev` edits the
	// files on disk instead, with no sign-in.
	storage: import.meta.env.PROD ? { kind: 'cloud' } : { kind: 'local' },
	cloud: { project: 'odysseyarm/website' },
	ui: {
		brand: { name: 'Odyssey website' },
		navigation: {
			'Site-wide': ['banner', 'settings'],
			Pages: ['home', 'downloads'],
			Content: ['blog', 'guides'],
		},
	},
	singletons: {
		banner: singleton({
			label: 'Announcement banner',
			path: 'src/content/site/banner',
			format: 'yaml',
			schema: {
				enabled: fields.checkbox({ label: 'Show the banner', defaultValue: false }),
				message: fields.text({ label: 'Message' }),
				link: link('Link (optional)'),
				tone: fields.select({
					label: 'Style',
					options: [
						{ label: 'Brand (purple)', value: 'brand' },
						{ label: 'Neutral (dark)', value: 'neutral' },
						{ label: 'Warning (amber)', value: 'warning' },
					],
					defaultValue: 'brand',
				}),
			},
		}),
		settings: singleton({
			label: 'Site settings',
			path: 'src/content/site/settings',
			format: 'yaml',
			schema: {
				description: fields.text({
					label: 'Site description',
					description: 'Shown in search results and link previews',
					multiline: true,
				}),
				nav: fields.array(link('Menu item'), {
					label: 'Top menu',
					itemLabel: (item) => item.fields.label.value || 'Menu item',
				}),
				storeUrl: fields.url({ label: 'Store link (button in the top menu)' }),
				email: fields.text({ label: 'Contact email' }),
				phone: fields.text({ label: 'Contact phone' }),
				copyright: fields.text({ label: 'Footer copyright line' }),
			},
		}),
		home: singleton({
			label: 'Front page',
			path: 'src/content/site/home',
			format: 'yaml',
			schema: {
				hero: fields.object(
					{
						title: fields.text({ label: 'Heading' }),
						subtitle: fields.text({ label: 'Subheading', multiline: true }),
						primary: link('Main button'),
						secondary: link('Second button'),
						videos: fields.array(fields.url({ label: 'YouTube link' }), {
							label: 'Videos next to the heading',
							description: 'The first one plays in the hero. Leave empty to show no video.',
							itemLabel: (item) => item.value || 'Video',
						}),
					},
					{ label: 'Top of the page' },
				),
				sections: fields.blocks(
					{
						feature: {
							label: 'Text and picture',
							itemLabel: (props) => props.fields.title.value || 'Text and picture',
							schema: fields.object({
								title: fields.text({ label: 'Heading' }),
								text: fields.text({ label: 'Text', multiline: true }),
								image: uploadImage('Picture'),
								imageAlt: fields.text({ label: 'Picture description (for screen readers)' }),
								imageSide: fields.select({
									label: 'Picture side',
									options: [
										{ label: 'Right', value: 'right' },
										{ label: 'Left', value: 'left' },
									],
									defaultValue: 'right',
								}),
								dark: fields.checkbox({ label: 'Dark background' }),
							}),
						},
						gallery: {
							label: 'Pictures in a row',
							itemLabel: (props) => props.fields.title.value || 'Pictures',
							schema: fields.object({
								title: fields.text({ label: 'Heading' }),
								text: fields.text({ label: 'Text', multiline: true }),
								images: fields.array(
									fields.object({
										image: uploadImage('Picture'),
										alt: fields.text({ label: 'Picture description' }),
									}),
									{ label: 'Pictures', itemLabel: (item) => item.fields.alt.value || 'Picture' },
								),
							}),
						},
						video: {
							label: 'Video',
							itemLabel: (props) => props.fields.title.value || 'Video',
							schema: fields.object({
								title: fields.text({ label: 'Heading' }),
								url: fields.url({ label: 'YouTube link' }),
							}),
						},
						callToAction: {
							label: 'Call to action',
							itemLabel: (props) => props.fields.title.value || 'Call to action',
							schema: fields.object({
								title: fields.text({ label: 'Heading' }),
								text: fields.text({ label: 'Text', multiline: true }),
								button: link('Button'),
							}),
						},
						latestPosts: {
							label: 'Latest blog posts',
							itemLabel: (props) => props.fields.title.value || 'Latest blog posts',
							schema: fields.object({
								title: fields.text({ label: 'Heading', defaultValue: 'News' }),
								count: fields.integer({ label: 'How many posts', defaultValue: 3 }),
							}),
						},
					},
					{ label: 'Sections (drag to reorder)' },
				),
			},
		}),
		downloads: singleton({
			label: 'Downloads page',
			path: 'src/content/site/downloads',
			format: 'yaml',
			schema: {
				title: fields.text({ label: 'Heading', defaultValue: 'Downloads' }),
				intro: fields.text({ label: 'Text above the downloads', multiline: true }),
				notes: fields.array(
					fields.object({
						title: fields.text({ label: 'Heading' }),
						text: fields.text({ label: 'Text', multiline: true }),
					}),
					{
						label: 'Extra notes below the downloads',
						itemLabel: (item) => item.fields.title.value || 'Note',
					},
				),
			},
		}),
	},
	collections: {
		blog: collection({
			label: 'Blog posts',
			path: 'src/content/blog/*',
			slugField: 'title',
			format: { contentField: 'content' },
			entryLayout: 'content',
			columns: ['title', 'date'],
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				date: fields.date({ label: 'Publish date', defaultValue: { kind: 'today' } }),
				author: fields.text({ label: 'Author' }),
				summary: fields.text({
					label: 'Summary',
					description: 'One or two sentences for the blog list and link previews',
					multiline: true,
				}),
				cover: fields.image({
					label: 'Cover picture',
					directory: 'src/assets/blog',
					publicPath: '../../assets/blog/',
				}),
				coverAlt: fields.text({ label: 'Cover picture description' }),
				draft: fields.checkbox({
					label: 'Draft',
					description: 'Drafts are saved but not shown on the live site',
				}),
				content: markdownBody('src/assets/blog', '../../assets/blog/'),
			},
		}),
		guides: collection({
			label: 'Product guides',
			path: 'src/content/docs/docs/guides/*',
			slugField: 'title',
			format: { contentField: 'content' },
			entryLayout: 'content',
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				description: fields.text({ label: 'Summary', multiline: true }),
				sidebar: fields.object(
					{
						order: fields.integer({
							label: 'Position in the menu',
							description: 'Lower numbers come first',
						}),
					},
					{ label: 'Menu' },
				),
				content: markdownBody('src/assets/guides', '../../../../assets/guides/'),
			},
		}),
	},
});
