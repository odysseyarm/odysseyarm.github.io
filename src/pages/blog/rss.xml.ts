import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../../lib/blog';

export async function GET(context: APIContext) {
	const posts = await getPosts();
	return rss({
		title: 'Odyssey news',
		description: 'News and announcements from Odyssey Arm.',
		site: context.site!,
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.summary ?? undefined,
			link: `/blog/${post.id}/`,
		})),
	});
}
