// Reads the content marketing edits in Keystatic (src/content/site/*.yaml).
// Runs at build time only.
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

async function required<T>(name: string, value: Promise<T | null>): Promise<T> {
	const data = await value;
	if (!data) throw new Error(`src/content/site/${name}.yaml is missing`);
	return data;
}

export const getSettings = () => required('settings', reader.singletons.settings.read());
export const getBanner = () => required('banner', reader.singletons.banner.read());
export const getHome = () => required('home', reader.singletons.home.read());
export const getDownloadsPage = () => required('downloads', reader.singletons.downloads.read());

/** True when `href` points somewhere other than this site. */
export const isExternal = (href: string) => /^[a-z]+:/i.test(href);
