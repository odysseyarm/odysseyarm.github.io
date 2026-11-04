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

// A heading in two colors, as on the front page: an orange part followed by a
// white part, optionally on its own line.
const twoToneHeading = (label: string) =>
	fields.object(
		{
			accent: fields.text({ label: 'Orange part (optional)' }),
			text: fields.text({ label: 'White part' }),
			newLine: fields.checkbox({ label: 'Start the white part on a new line' }),
		},
		{ label, layout: [5, 5, 2] },
	);

// Item labels for the section list in the editor.
const headingLabel = (heading: { fields: { accent: { value: string }; text: { value: string } } }) =>
	[heading.fields.accent.value, heading.fields.text.value].filter(Boolean).join(' ');

// Multi-line text where a blank line starts a new paragraph.
const paragraphsField = (label: string) =>
	fields.text({ label, description: 'Leave a blank line between paragraphs', multiline: true });

// A list whose items can be shown in orange to stand out.
const highlightList = (label: string) =>
	fields.array(
		fields.object(
			{
				text: fields.text({ label: 'Text', multiline: true }),
				highlight: fields.checkbox({ label: 'Orange' }),
			},
			{ layout: [10, 2] },
		),
		{ label, itemLabel: (item) => item.fields.text.value || 'Item' },
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
						{ label: 'Brand (orange)', value: 'brand' },
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
						heading: twoToneHeading('Heading'),
						text: paragraphsField('Text'),
						primary: link('Main button'),
						secondary: link('Second button (optional)'),
						image: uploadImage('Picture'),
						imageAlt: fields.text({ label: 'Picture description (for screen readers)' }),
					},
					{ label: 'Top of the page' },
				),
				sections: fields.blocks(
					{
						columns: {
							label: 'Columns with lists',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Columns',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								intro: paragraphsField('Text under the heading'),
								columns: fields.array(
									fields.object({
										title: fields.text({ label: 'Title' }),
										text: paragraphsField('Text'),
										items: highlightList('List'),
										highlight: fields.checkbox({ label: 'Show as an orange card' }),
									}),
									{ label: 'Columns', itemLabel: (item) => item.fields.title.value || 'Column' },
								),
							}),
						},
						numbered: {
							label: 'Numbered columns',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Numbered columns',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								intro: paragraphsField('Text under the heading'),
								columns: fields.array(
									fields.object({
										title: fields.text({ label: 'Title' }),
										items: highlightList('Numbered list'),
									}),
									{ label: 'Columns', itemLabel: (item) => item.fields.title.value || 'Column' },
								),
							}),
						},
						list: {
							label: 'Heading and list',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'List',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								items: highlightList('List'),
							}),
						},
						cards: {
							label: 'Picture cards',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Picture cards',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								subheading: twoToneHeading('Subheading'),
								cards: fields.array(
									fields.object({
										image: uploadImage('Picture'),
										imageAlt: fields.text({ label: 'Picture description' }),
										title: fields.text({ label: 'Title' }),
										text: paragraphsField('Text'),
										highlight: fields.checkbox({ label: 'Orange title' }),
									}),
									{ label: 'Cards', itemLabel: (item) => item.fields.title.value || 'Card' },
								),
							}),
						},
						specs: {
							label: 'Specifications',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Specifications',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								left: fields.object(
									{
										title: fields.text({ label: 'Title' }),
										text: paragraphsField('Text'),
										rows: fields.array(
											fields.object(
												{
													label: fields.text({ label: 'Name' }),
													value: fields.text({ label: 'Value' }),
													highlight: fields.checkbox({ label: 'Orange' }),
												},
												{ layout: [5, 5, 2] },
											),
											{ label: 'Table', itemLabel: (item) => item.fields.label.value || 'Row' },
										),
									},
									{ label: 'Left column' },
								),
								right: fields.object(
									{
										title: fields.text({ label: 'Title' }),
										text: paragraphsField('Text'),
										listTitle: fields.text({ label: 'Text above the list' }),
										items: highlightList('List'),
										calloutTitle: fields.text({ label: 'Orange box: title' }),
										calloutText: fields.text({ label: 'Orange box: text', multiline: true }),
									},
									{ label: 'Right column' },
								),
							}),
						},
						iconCards: {
							label: 'Cards with icons',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Cards with icons',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								intro: paragraphsField('Text under the heading'),
								cards: fields.array(
									fields.object({
										icon: fields.select({
											label: 'Icon',
											options: [
												{ label: 'Instructor', value: 'instructor' },
												{ label: 'Store', value: 'store' },
												{ label: 'Handshake', value: 'handshake' },
												{ label: 'Target', value: 'target' },
												{ label: 'Code', value: 'code' },
											],
											defaultValue: 'target',
										}),
										title: fields.text({ label: 'Title' }),
										paragraphs: highlightList('Paragraphs'),
									}),
									{ label: 'Cards', itemLabel: (item) => item.fields.title.value || 'Card' },
								),
							}),
						},
						contact: {
							label: 'Contact',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Contact',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								subheading: fields.text({ label: 'Subheading' }),
								text: paragraphsField('Text'),
								cards: fields.array(
									fields.object({
										title: fields.text({ label: 'Title' }),
										text: fields.text({ label: 'Text', multiline: true }),
										href: fields.text({ label: 'Link (optional)' }),
										highlight: fields.checkbox({ label: 'Orange card' }),
									}),
									{ label: 'Cards', itemLabel: (item) => item.fields.title.value || 'Card' },
								),
								button: link('Button'),
							}),
						},
						feature: {
							label: 'Text and picture',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Text and picture',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								text: paragraphsField('Text'),
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
								button: link('Button (optional)'),
							}),
						},
						video: {
							label: 'Video',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Video',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								url: fields.url({ label: 'YouTube link' }),
							}),
						},
						callToAction: {
							label: 'Call to action',
							itemLabel: (props) => headingLabel(props.fields.heading) || 'Call to action',
							schema: fields.object({
								heading: twoToneHeading('Heading'),
								text: paragraphsField('Text'),
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
