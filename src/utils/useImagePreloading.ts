/**
 * React hooks for image preloading
 */

import { useEffect, useMemo } from 'react';
import { imagePreloader } from './imagePreloader';
import { Actor, getEmotionImage } from '../content/Actor';
import { Stage } from '../Stage';
import { Location } from '../content/Location';

/**
 * Preload emotion images for a given actor
 */
export function usePreloadActorImages(actor: Actor | null, stage: Stage | null): void {
	useEffect(() => {
		if (!actor || !stage) return;

		const urls: string[] = [];

		// Collect all emotion pack URLs
		actor.outfits?.forEach((outfit) => {
			if (outfit.emotionPack) {
				Object.values(outfit.emotionPack).forEach((url: string) => {
					if (url && typeof url === 'string') {
						urls.push(url);
					}
				});
			}
		});

		if (urls.length > 0) {
			// Prioritize neutral image first
			const neutralUrl = actor.outfits?.[0]?.emotionPack?.['neutral'];
			const prioritizedUrls = neutralUrl
				? [neutralUrl, ...urls.filter((u) => u !== neutralUrl)]
				: urls;

			imagePreloader.scheduleIdlePreload(prioritizedUrls);
		}
	}, [actor, stage]);
}

/**
 * Preload images for location details
 */
export function usePreloadLocationImage(location: Location | null): void {
	useEffect(() => {
		if (!location?.imageUrl) return;

		// Location images are typically local and already eagerly loaded,
		// but we can preload related images
		imagePreloader.scheduleIdlePreload([location.imageUrl]);
	}, [location?.imageUrl]);
}

/**
 * Preload location map images
 */
export function usePreloadLocationMap(locations: Location[]): void {
	const preloadSignature = useMemo(() => {
		if (!locations || locations.length === 0) return '';

		const uniqueUrls = [...new Set(
			locations
				.filter((loc) => loc.imageUrl)
				.map((loc) => loc.imageUrl)
		)];

		return uniqueUrls.sort().join('|');
	}, [locations]);

	useEffect(() => {
		if (!preloadSignature) return;

		const imageUrls = preloadSignature.split('|').filter(Boolean);
		if (imageUrls.length === 0) return;

		// Stagger the preloading to avoid network congestion.
		const timeoutId = window.setTimeout(() => {
			imagePreloader.scheduleIdlePreload(imageUrls);
		}, 1000);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [preloadSignature]);
}

/**
 * Create a batch preload for critical images (actor neutrals + locations)
 */
export function usePreloadCriticalImages(
	actors: Actor[],
	locations: Location[]
): void {
	useEffect(() => {
		const urls: string[] = [];

		// Get neutral images from actors
		actors.forEach((actor) => {
			const firstOutfit = actor.outfits?.[0];
			const neutralUrl = firstOutfit?.emotionPack?.['neutral'];
			if (neutralUrl && typeof neutralUrl === 'string') {
				urls.push(neutralUrl);
			}
		});

		// Get location images
		locations.forEach((loc) => {
			if (loc.imageUrl && typeof loc.imageUrl === 'string') {
				urls.push(loc.imageUrl);
			}
		});

		if (urls.length > 0) {
			// Prioritize neutral images, then location images
			const neutral = urls.filter((u) => u.includes('neutral'));
			const locations = urls.filter((u) => !u.includes('neutral'));
			const prioritized = [...neutral, ...locations];

			imagePreloader.scheduleIdlePreload(prioritized);
		}
	}, [actors, locations]);
}
