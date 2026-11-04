// Keystatic stores pictures picked on the home page as paths such as
// "/src/assets/uploads/sections/0/image.jpg". This maps that path back to the
// imported image so <Image> can resize and convert it at build time.
import type { ImageMetadata } from 'astro';

const uploads = import.meta.glob<{ default: ImageMetadata }>(
	'/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,gif}',
	{ eager: true },
);

export function uploadedImage(path: string | null | undefined): ImageMetadata | undefined {
	if (!path) return undefined;
	const image = uploads[path.startsWith('/') ? path : `/${path}`]?.default;
	if (!image) throw new Error(`Picture not found: ${path}`);
	return image;
}
