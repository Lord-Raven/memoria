/**
 * Image Preloading and Caching Utility
 * Preloads critical images in the background and caches external images for faster retrieval
 */

interface PreloadedImage {
	url: string;
	timestamp: number;
	data?: Blob;
	objectUrl?: string;
}

const CACHE_KEY = 'memoria_image_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE_MB = 50; // Max cache size in MB

// Re-export React for the hook
export { default as React } from 'react';

class ImagePreloaderService {
	private preloadedImages: Map<string, PreloadedImage> = new Map();
	private inflightPreloads: Map<string, Promise<void>> = new Map();
	private isPreloading = false;
	private requestIdleCallbackId: number | null = null;

	constructor() {
		this.loadCacheFromStorage();
	}

	/**
	 * Preload a single image URL
	 */
	async preloadImage(url: string): Promise<void> {
		if (!url) {
			return;
		}

		const existing = this.preloadedImages.get(url);
		if (existing?.data || existing?.objectUrl) {
			return;
		}

		const inflight = this.inflightPreloads.get(url);
		if (inflight) {
			await inflight;
			return;
		}

		const preloadPromise = (async () => {
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				const data = await response.blob();
				const objectUrl = URL.createObjectURL(data);
				this.preloadedImages.set(url, {
					url,
					timestamp: Date.now(),
					data,
					objectUrl,
				});

				// Optionally save to cache storage
				this.saveCacheToStorage();
			} catch (error) {
				console.warn(`Failed to preload image: ${url}`, error);
			}
		})();

		this.inflightPreloads.set(url, preloadPromise);
		try {
			await preloadPromise;
		} finally {
			this.inflightPreloads.delete(url);
		}
	}

	/**
	 * Preload multiple images with priority queue
	 */
	async preloadImages(urls: string[]): Promise<void> {
		const uniqueUrls = [...new Set(urls)].filter(
			(url) => url && !this.preloadedImages.has(url)
		);

		if (uniqueUrls.length === 0) return;

		this.isPreloading = true;

		// Load with concurrency limit of 3
		const concurrency = 3;
		for (let i = 0; i < uniqueUrls.length; i += concurrency) {
			const batch = uniqueUrls.slice(i, i + concurrency);
			await Promise.allSettled(batch.map((url) => this.preloadImage(url)));
		}

		this.isPreloading = false;
	}

	/**
	 * Schedule preloading for when the browser is idle
	 */
	scheduleIdlePreload(urls: string[]): void {
		if (this.requestIdleCallbackId !== null) {
			cancelIdleCallback(this.requestIdleCallbackId);
		}

		this.requestIdleCallbackId = requestIdleCallback(
			() => {
				this.preloadImages(urls);
				this.requestIdleCallbackId = null;
			},
			{ timeout: 5000 }
		);
	}

	/**
	 * Get a preloaded image as a data URL or return the original URL
	 */
	getImageUrl(url: string): string {
		if (!url) return '';

		const cached = this.preloadedImages.get(url);
		if (cached?.objectUrl) {
			return cached.objectUrl;
		}

		if (cached?.data) {
			cached.objectUrl = URL.createObjectURL(cached.data);
			return cached.objectUrl;
		}

		return url;
	}

	/**
	 * Check if an image is cached
	 */
	isCached(url: string): boolean {
		return this.preloadedImages.has(url);
	}

	/**
	 * Save cache to localStorage
	 */
	private saveCacheToStorage(): void {
		try {
			const cacheData = Array.from(this.preloadedImages.entries())
				.filter(([_, data]) => data.data)
				.map(([url, data]) => ({
					url,
					timestamp: data.timestamp,
				}));

			sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
		} catch (error) {
			console.warn('Failed to save image cache to storage', error);
		}
	}

	/**
	 * Load cache from localStorage
	 */
	private loadCacheFromStorage(): void {
		try {
			const cached = sessionStorage.getItem(CACHE_KEY);
			if (cached) {
				const cacheData = JSON.parse(cached) as Array<{
					url: string;
					timestamp: number;
				}>;

				// Only restore recent cache entries
				const now = Date.now();
				cacheData.forEach(({ url, timestamp }) => {
					if (now - timestamp < CACHE_EXPIRY_MS) {
						this.preloadedImages.set(url, {
							url,
							timestamp,
						});
					}
				});
			}
		} catch (error) {
			console.warn('Failed to load image cache from storage', error);
		}
	}

	/**
	 * Clear old cache entries
	 */
	clearExpiredCache(): void {
		const now = Date.now();
		const entriesToDelete: string[] = [];

		this.preloadedImages.forEach(({ timestamp }, url) => {
			if (now - timestamp > CACHE_EXPIRY_MS) {
				entriesToDelete.push(url);
			}
		});

		entriesToDelete.forEach((url) => {
			const cached = this.preloadedImages.get(url);
			if (cached?.objectUrl) {
				URL.revokeObjectURL(cached.objectUrl);
			}
			this.preloadedImages.delete(url);
		});
		this.saveCacheToStorage();
	}

	/**
	 * Clear all cached images
	 */
	clearCache(): void {
		this.preloadedImages.forEach((cached) => {
			if (cached.objectUrl) {
				URL.revokeObjectURL(cached.objectUrl);
			}
		});
		this.preloadedImages.clear();
		try {
			sessionStorage.removeItem(CACHE_KEY);
		} catch (error) {
			console.warn('Failed to clear image cache', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		const stats = {
			cachedCount: this.preloadedImages.size,
			withBlobs: Array.from(this.preloadedImages.values()).filter((v) => v.data)
				.length,
		};
		return stats;
	}
}

export const imagePreloader = new ImagePreloaderService();

