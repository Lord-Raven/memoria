# Image Loading Optimization Guide

## Overview

Your Memoria game now has a comprehensive image preloading and caching system to keep Actor emotions and Location images readily available. This eliminates the jarring delays when images load on-demand.

## What Was Implemented

### 1. **Image Preloader Service** (`src/utils/imagePreloader.ts`)

A singleton service that manages image caching and preloading:

- **Preloading**: Downloads images in the background during idle time using `requestIdleCallback`
- **Caching**: Stores fetched images in memory with optional sessionStorage persistence
- **Concurrency Control**: Limits concurrent requests to 3 to avoid network congestion
- **Expiry**: Automatically clears cache entries after 7 days

**Key Methods:**
- `preloadImage(url)` - Preload a single image
- `preloadImages(urls)` - Preload multiple images with concurrency
- `scheduleIdlePreload(urls)` - Queue preloading for when browser is idle
- `getImageUrl(url)` - Get cached image or return original URL
- `isCached(url)` - Check if image is cached
- `getCacheStats()` - View cache statistics

### 2. **React Preloading Hooks** (`src/utils/useImagePreloading.ts`)

Convenient React hooks for components:

- `usePreloadActorImages(actor, stage)` - Preload all emotion images for an actor
- `usePreloadLocationImage(location)` - Preload a single location image
- `usePreloadLocationMap(locations)` - Preload all location images, staggered
- `usePreloadCriticalImages(actors, locations)` - Batch preload with priority (neutral images first)

### 3. **Integration Points**

Images are now automatically preloaded in:

- **BaseScreen** (`src/screens/BaseScreen.tsx`): Preloads all critical images (actor neutrals + location maps) on app startup
- **MapScreen** (`src/screens/MapScreen.tsx`): Preloads location images when map is displayed
- **ActorDetailScreen** (`src/screens/ActorDetailScreen.tsx`): Preloads actor emotion images when detail screen opens

### 4. **HTML Optimization** (`index.html`)

Added browser hints for faster CDN access:

```html
<!-- Preload critical external images -->
<link rel="preload" href="..." as="image">

<!-- DNS prefetch for CDN domains -->
<link rel="dns-prefetch" href="https://avatars.charhub.io">
<link rel="dns-prefetch" href="https://media.charhub.io">
```

## How It Works

### Preloading Flow

1. **App Startup**: `BaseScreen` calls `usePreloadCriticalImages()`
   - Extracts all actor neutral images and location images
   - Prioritizes neutral images (they're used most frequently)
   - Schedules preloading via `imagePreloader.scheduleIdlePreload()`

2. **Idle Time Callback**: `requestIdleCallback` triggers when browser is not busy
   - Fetches images with max 3 concurrent requests
   - Stores them in memory for instant access
   - Saves metadata to sessionStorage for persistence

3. **View-Specific Preloading**:
   - **Map enters**: Location images preloaded with 1-second stagger
   - **Actor detail opens**: All emotion images for that actor preloaded
   - **Component cleanup**: Services persist for entire session

4. **Image Access**: When rendering:
   ```typescript
   const imageUrl = imagePreloader.getImageUrl(cachedUrl);
   // Returns object URL if cached, or original URL if not
   ```

## Local vs External Images

### Local Images (Location Assets)
- Bundled via Vite's `import.meta.glob()` with `eager: true`
- Already fast due to bundling
- Preloading ensures they stay in browser memory
- Served directly from `/assets/` directory

### External Images (Actor Emotions)
- Fetched from CDN (charhub.io, media.charhub.io)
- Previously loaded on-demand, causing delays
- Now preloaded and cached for instant display
- Fallback to original URL if network is slow

## Performance Impact

### Before Optimization
- Actor emotion images: Load when first displayed (jarring)
- User sees placeholder, then image appears ~500ms-2s later
- Location images: Already fast but could timeout on slow connections

### After Optimization
- Critical images preload during app idle time
- Most images available before user interacts with them
- Smooth visual experience, no jarring image loads
- Fallback to streaming if preload fails

## Configuration & Extension

### Adjusting Preload Behavior

In `src/utils/imagePreloader.ts`:

```typescript
// Concurrency limit (higher = faster, more network)
const concurrency = 3;

// Cache expiry (7 days by default)
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Max cache size (currently unlimited)
const MAX_CACHE_SIZE_MB = 50;
```

### Adding Custom Preloading

```typescript
import { usePreloadActorImages, usePreloadLocationMap } from '../utils/useImagePreloading';
import { imagePreloader } from '../utils/imagePreloader';

// In a component:
useEffect(() => {
  // Preload custom images
  imagePreloader.scheduleIdlePreload([
    'https://example.com/image1.png',
    'https://example.com/image2.png'
  ]);
}, []);

// Or immediate preload:
imagePreloader.preloadImages(['url1', 'url2']);
```

### Monitoring Cache Status

```typescript
import { imagePreloader } from '../utils/imagePreloader';

// Check cache stats
const stats = imagePreloader.getCacheStats();
console.log(`Cached: ${stats.cachedCount}, With Blobs: ${stats.withBlobs}`);

// Clear cache manually
imagePreloader.clearCache();
```

## Browser Compatibility

- **requestIdleCallback**: Polyfilled for older browsers (fallback to `setTimeout`)
- **sessionStorage**: Used for metadata persistence only (not critical)
- **Blob API**: Standard in all modern browsers
- Gracefully degrades if any feature is unavailable

## Troubleshooting

### Images Still Loading Slowly
1. Check browser DevTools Network tab - verify preload requests complete
2. Verify browser idle time is available (some extensions block it)
3. Check sessionStorage quota hasn't been exceeded
4. Try clearing cache: `imagePreloader.clearCache()`

### Memory Usage Growing
- Session cache automatically expires after 7 days
- Clear cache in console if needed: `imagePreloader.clearCache()`
- Adjust `MAX_CACHE_SIZE_MB` to limit caching

### Specific Image Not Cached
- Ensure image URL is in the preload list
- Check network tab to see if fetch succeeded or failed
- Verify URL hasn't changed (returns different image)
- Add logging: `console.log(imagePreloader.getCacheStats())`

## Best Practices

✅ **Do:**
- Preload actor neutral images especially (used most often)
- Batch preload location maps together
- Use `scheduleIdlePreload` for non-critical images
- Monitor cache stats in development

❌ **Don't:**
- Preload too many images at once (network congestion)
- Preload images the user never sees
- Ignore cache errors/warnings in console
- Manually manage cache in production (let auto-expiry handle it)

## Future Enhancements

Potential improvements to consider:

1. **Service Worker Integration**: Persist cache across sessions
2. **Progressive Image Loading**: Show low-quality placeholder while high-res loads
3. **Adaptive Preloading**: Detect network speed and adjust strategy
4. **Cache Size Limits**: Implement LRU eviction when cache is full
5. **Analytics**: Track which images are most frequently accessed
6. **WebP Support**: Auto-convert and cache optimized formats

## Related Files

- `src/utils/imagePreloader.ts` - Core preLoading service
- `src/utils/useImagePreloading.ts` - React hooks
- `src/screens/BaseScreen.tsx` - App-wide preloading
- `src/screens/MapScreen.tsx` - Map-specific preloading
- `src/screens/ActorDetailScreen.tsx` - Actor-specific preloading
- `index.html` - Browser optimization hints
