import { FC, useEffect, useState } from "react";
import { imagePreloader } from "../utils/imagePreloader";

export interface MapCellPoint {
	id: string;
	x: number;
	y: number;
	radius: number;
	imageUrl: string;
	focalPoint: { x: number; y: number };
	themeColor: string;
}

export interface MapCellData {
	point: MapCellPoint;
	path: string;
	clipPathId: string;
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

interface MapCellProps {
	cell: MapCellData;
	targetRadius: number;
	backgroundAspectCompensationX?: number;
	backgroundAspectCompensationY?: number;
	backgroundBlurPx?: number;
	backgroundDimOpacity?: number;
	onPointerEnter: (cellId: string) => void;
	onPointerLeave: () => void;
	opacity?: number;
	isInteractive?: boolean;
	lockBackgroundToTargetRadius?: boolean;
	isExpeditionable?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const BACKGROUND_LOCKED_ZOOM = 1.5;
const BACKGROUND_FILL = "rgba(14, 30, 43, 0.92)";

interface ImageDimensions {
	width: number;
	height: number;
}

const imageDimensionsCache = new Map<string, ImageDimensions>();
const imageDimensionsPromiseCache = new Map<string, Promise<ImageDimensions | null>>();

const loadImageDimensions = (imageUrl: string): Promise<ImageDimensions | null> => {
	if (!imageUrl) {
		return Promise.resolve(null);
	}

	const cachedDimensions = imageDimensionsCache.get(imageUrl);
	if (cachedDimensions) {
		return Promise.resolve(cachedDimensions);
	}

	const inflightDimensions = imageDimensionsPromiseCache.get(imageUrl);
	if (inflightDimensions) {
		return inflightDimensions;
	}

	const dimensionsPromise = new Promise<ImageDimensions | null>((resolve) => {
		const image = new Image();

		const handleLoad = () => {
			if (!image.naturalWidth || !image.naturalHeight) {
				resolve(null);
				return;
			}

			const nextDimensions = {
				width: image.naturalWidth,
				height: image.naturalHeight,
			};
			imageDimensionsCache.set(imageUrl, nextDimensions);
			resolve(nextDimensions);
		};

		const handleError = () => resolve(null);

		image.addEventListener("load", handleLoad, { once: true });
		image.addEventListener("error", handleError, { once: true });
		image.src = imageUrl;
		if (image.complete) {
			handleLoad();
		}
	});

	imageDimensionsPromiseCache.set(imageUrl, dimensionsPromise);
	void dimensionsPromise.finally(() => {
		imageDimensionsPromiseCache.delete(imageUrl);
	});

	return dimensionsPromise;
};


const useMapCellImageData = (imageUrl: string) => {
	const [resolvedImageUrl, setResolvedImageUrl] = useState<string>(() => imagePreloader.getImageUrl(imageUrl));
	const [dimensions, setDimensions] = useState<ImageDimensions | null>(() => imageDimensionsCache.get(imageUrl) ?? null);

	useEffect(() => {
		if (!imageUrl) {
			setResolvedImageUrl("");
			setDimensions(null);
			return;
		}

		let isCancelled = false;
		setResolvedImageUrl(imagePreloader.getImageUrl(imageUrl));
		setDimensions(imageDimensionsCache.get(imageUrl) ?? null);

		void imagePreloader.preloadImage(imageUrl).finally(() => {
			if (!isCancelled) {
				setResolvedImageUrl(imagePreloader.getImageUrl(imageUrl));
			}
		});

		void loadImageDimensions(imageUrl).then((nextDimensions) => {
			if (!isCancelled) {
				setDimensions(nextDimensions);
			}
		});

		return () => {
			isCancelled = true;
		};
	}, [imageUrl]);

	return {
		resolvedImageUrl,
		dimensions,
	};
};

const asHexColor = (value: string) => {
	const normalized = (value ?? "fff").trim();
	return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(normalized) ? normalized : "";
};

const hexToRgb = (hexColor: string) => {
	const hex = asHexColor(hexColor).replace("#", "");
	if (!hex) {
		return null;
	}

	const expandedHex = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
	const parsed = Number.parseInt(expandedHex, 16);
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return {
		r: (parsed >> 16) & 255,
		g: (parsed >> 8) & 255,
		b: parsed & 255,
	};
};

const colorWithAlpha = (hexColor: string, alpha: number, fallback: string) => {
	const rgb = hexToRgb(hexColor);
	if (!rgb) {
		return fallback;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
};

const getLocationBorderPalette = (themeColor: string) => {
	const normalizedThemeColor = asHexColor(themeColor) || "#d7be7a";
	return {
		stroke: colorWithAlpha(normalizedThemeColor, 0.86, "rgba(215, 190, 122, 0.86)"),
	};
};

export const MapCell: FC<MapCellProps> = ({
	cell,
	targetRadius,
	backgroundAspectCompensationX = 1,
	backgroundAspectCompensationY = 1,
	backgroundBlurPx = 0.5,
	backgroundDimOpacity = 0,
	onPointerEnter,
	onPointerLeave,
	opacity = 1,
	isInteractive = true,
	lockBackgroundToTargetRadius = true,
	isExpeditionable = true,
}) => {
	const { resolvedImageUrl, dimensions: imageDimensions } = useMapCellImageData(cell.point.imageUrl);
	const borderPalette = getLocationBorderPalette(cell.point.themeColor);
	const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
	const outlineStrokeWidth = 4;
	const shadeOpacity = 0.28 - emphasis * 0.06;
	const focalX = clamp(cell.point.focalPoint.x, 0, 1);
	const focalY = clamp(cell.point.focalPoint.y, 0, 1);
	const compensationX = clamp(backgroundAspectCompensationX, 1e-3, 1000);
	const compensationY = clamp(backgroundAspectCompensationY, 1e-3, 1000);
	const referenceDiameter = Math.max(1, targetRadius * 2);
	const lockedBackgroundWidth = referenceDiameter * BACKGROUND_LOCKED_ZOOM;
	const lockedBackgroundHeight = referenceDiameter * BACKGROUND_LOCKED_ZOOM;
	const backgroundWidth = lockBackgroundToTargetRadius
		? Math.max(cell.bounds.width, lockedBackgroundWidth)
		: cell.bounds.width;
	const backgroundHeight = lockBackgroundToTargetRadius
		? Math.max(cell.bounds.height, lockedBackgroundHeight)
		: cell.bounds.height;
	const backgroundLeft = (cell.bounds.width - backgroundWidth) * focalX;
	const backgroundTop = (cell.bounds.height - backgroundHeight) * focalY;
	const backgroundRenderWidth = backgroundWidth / compensationX;
	const backgroundRenderHeight = backgroundHeight / compensationY;
	const backgroundRenderLeft = backgroundLeft / compensationX;
	const backgroundRenderTop = backgroundTop / compensationY;

	let backgroundImageX = cell.bounds.x + backgroundLeft;
	let backgroundImageY = cell.bounds.y + backgroundTop;
	let backgroundImageWidth = backgroundWidth;
	let backgroundImageHeight = backgroundHeight;

	if (imageDimensions && imageDimensions.width > 0 && imageDimensions.height > 0) {
		const imageAspectRatio = imageDimensions.width / imageDimensions.height;
		const backgroundAspectRatio = backgroundRenderWidth / backgroundRenderHeight;

		if (imageAspectRatio > backgroundAspectRatio) {
			const coverRenderHeight = backgroundRenderHeight;
			const coverRenderWidth = coverRenderHeight * imageAspectRatio;
			const coverRenderX = backgroundRenderLeft - (coverRenderWidth - backgroundRenderWidth) * focalX;

			backgroundImageX = cell.bounds.x + coverRenderX * compensationX;
			backgroundImageY = cell.bounds.y + backgroundTop;
			backgroundImageWidth = coverRenderWidth * compensationX;
			backgroundImageHeight = backgroundHeight;
		} else {
			const coverRenderWidth = backgroundRenderWidth;
			const coverRenderHeight = coverRenderWidth / imageAspectRatio;
			const coverRenderY = backgroundRenderTop - (coverRenderHeight - backgroundRenderHeight) * focalY;

			backgroundImageX = cell.bounds.x + backgroundLeft;
			backgroundImageY = cell.bounds.y + coverRenderY * compensationY;
			backgroundImageWidth = backgroundWidth;
			backgroundImageHeight = coverRenderHeight * compensationY;
		}
	}

	return (
		<g style={{ opacity, transition: "opacity 260ms ease" }}>
			<rect
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				fill={BACKGROUND_FILL}
				clipPath={`url(#${cell.clipPathId})`}
				style={{ pointerEvents: "none" }}
			/>
			{imageDimensions && (
				<image
					href={resolvedImageUrl || cell.point.imageUrl}
					x={backgroundImageX}
					y={backgroundImageY}
					width={backgroundImageWidth}
					height={backgroundImageHeight}
					preserveAspectRatio="none"
					clipPath={`url(#${cell.clipPathId})`}
					style={{
						filter: `blur(${backgroundBlurPx}px)`,
						transition: "filter 260ms ease, opacity 180ms ease",
						pointerEvents: "none",
						userSelect: "none",
					}}
				/>
			)}
			<rect
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				fill={`rgba(4, 10, 16, ${clamp(backgroundDimOpacity, 0, 0.7)})`}
				clipPath={`url(#${cell.clipPathId})`}
				style={{
					pointerEvents: "none",
					transition: "fill 260ms ease",
				}}
			/>
			<path d={cell.path} fill={`rgba(10, 26, 39, ${shadeOpacity})`} style={{ pointerEvents: "none" }} />
			<path
				d={cell.path}
				fill="none"
				stroke={borderPalette.stroke}
				strokeWidth={outlineStrokeWidth}
				strokeLinejoin="round"
				clipPath={`url(#${cell.clipPathId})`}
				style={{ pointerEvents: "none" }}
			/>
			{!isExpeditionable && (
				<path
					d={cell.path}
					fill={`url(#unavailableDiagonalStripes-${cell.point.id})`}
					clipPath={`url(#${cell.clipPathId})`}
					style={{ pointerEvents: "none" }}
					opacity={0.5}
				/>
			)}
			<path
				d={cell.path}
				fill="rgba(255,255,255,0)"
				style={{ pointerEvents: isInteractive ? "all" : "none" }}
				data-cell-id={cell.point.id}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
		</g>
	);
};