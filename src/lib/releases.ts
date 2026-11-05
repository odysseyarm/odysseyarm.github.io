// Download links come from GitHub releases on odysseyarm/odyssey, so a new
// release shows up on the site at the next build without anyone editing it.
const REPO = 'odysseyarm/odyssey';

export interface Download {
	label: string;
	platform: 'Windows' | 'Linux';
	file: string;
	url: string;
	size: number;
}

export interface Release {
	version: string;
	date: Date;
	url: string;
	downloads: Download[];
}

interface GitHubRelease {
	tag_name: string;
	html_url: string;
	published_at: string;
	draft: boolean;
	prerelease: boolean;
	assets: { name: string; browser_download_url: string; size: number }[];
}

const DESKTOP_ASSETS: { match: RegExp; label: string; platform: Download['platform'] }[] = [
	{ match: /-win-x64\.msi$/, label: 'Windows installer', platform: 'Windows' },
	{ match: /-win-x64-full\.msi$/, label: 'Windows full installer', platform: 'Windows' },
	{ match: /\.AppImage$/, label: 'Linux AppImage', platform: 'Linux' },
];

async function fetchReleases(): Promise<GitHubRelease[]> {
	const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
	// CI passes a token so builds are not rate-limited; local builds work without one.
	const token = process.env.GITHUB_TOKEN;
	if (token) headers.Authorization = `Bearer ${token}`;
	const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers });
	if (!res.ok) throw new Error(`GitHub releases request failed: ${res.status} ${res.statusText}`);
	return res.json();
}

let cache: Promise<GitHubRelease[]> | undefined;

/** Latest published Odyssey Desktop release (tags `odyssey-desktop-v*`). */
export async function latestDesktopRelease(): Promise<Release | undefined> {
	cache ??= fetchReleases();
	const release = (await cache).find(
		(r) => !r.draft && !r.prerelease && r.tag_name.startsWith('odyssey-desktop-v'),
	);
	if (!release) return undefined;
	const downloads = DESKTOP_ASSETS.flatMap(({ match, label, platform }) => {
		const asset = release.assets.find((a) => match.test(a.name));
		return asset
			? [{ label, platform, file: asset.name, url: asset.browser_download_url, size: asset.size }]
			: [];
	});
	return {
		version: release.tag_name.replace('odyssey-desktop-v', ''),
		date: new Date(release.published_at),
		url: release.html_url,
		downloads,
	};
}

export const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
