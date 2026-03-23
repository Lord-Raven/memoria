const IMAGE_ASSET_URLS = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp,avif}', {
	eager: true,
	import: 'default',
}) as Record<string, string>;

const normalizeAssetPath = (path: string): string => path.replace(/^\/+|\/+$/g, '');

export const createImageAssetUrlResolver = (assetDirectory: string) => {
	const normalizedDirectory = normalizeAssetPath(assetDirectory);
	const assetBasePath = normalizedDirectory ? `../assets/${normalizedDirectory}/` : '../assets/';

	return (relativePath: string): string => {
		const normalizedRelativePath = relativePath.replace(/^\/+/, '');
		const imageUrl = IMAGE_ASSET_URLS[`${assetBasePath}${normalizedRelativePath}`];

		if (!imageUrl) {
			const missingAssetLabel = normalizedDirectory || 'asset';
			throw new Error(`Missing image for ${missingAssetLabel}: ${normalizedRelativePath}`);
		}

		return imageUrl;
	};
};