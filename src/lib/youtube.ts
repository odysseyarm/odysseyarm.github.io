/** Accepts any common YouTube link and returns its video id. */
export function youtubeId(url: string | null | undefined): string | undefined {
	if (!url) return undefined;
	try {
		const u = new URL(url);
		if (u.hostname === 'youtu.be') return u.pathname.slice(1) || undefined;
		if (u.searchParams.has('v')) return u.searchParams.get('v') ?? undefined;
		const match = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/);
		return match?.[1];
	} catch {
		return undefined;
	}
}
