import { FC } from "react";
import { motion } from "framer-motion";

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
	polygon: number[][];
	clipPathId: string;
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

export interface MapCellPresentationState {
	isFullscreen?: boolean;
}

interface MapBounds {
	width: number;
	height: number;
}

interface MapCellProps {
	cell: MapCellData;
	targetRadius: number;
	mapBounds: MapBounds;
	presentationState?: MapCellPresentationState;
	onPointerEnter: (cellId: string) => void;
	onPointerLeave: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const BACKGROUND_LOCKED_ZOOM = 1.5;
const BACKGROUND_FULLSCREEN_ZOOM = 1.0;
const CELL_TRANSITION = { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const };

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

const getPolygonClipPath = (polygon: number[][], bounds: MapCellData["bounds"]) => {
	if (polygon.length < 3) {
		return "inset(0% 0% 0% 0%)";
	}

	const width = Math.max(bounds.width, 1);
	const height = Math.max(bounds.height, 1);
	const points = polygon.map(([x, y]) => {
		const relativeX = clamp(((x - bounds.x) / width) * 100, 0, 100);
		const relativeY = clamp(((y - bounds.y) / height) * 100, 0, 100);
		return `${relativeX.toFixed(3)}% ${relativeY.toFixed(3)}%`;
	});

	return `polygon(${points.join(", ")})`;
};

const getFullscreenExpansionRadius = (mapBounds: MapBounds) => {
	const diagonal = Math.sqrt(mapBounds.width * mapBounds.width + mapBounds.height * mapBounds.height);
	return diagonal / 2;
};

export const MapCell: FC<MapCellProps> = ({
	cell,
	targetRadius,
	mapBounds,
	presentationState,
	onPointerEnter,
	onPointerLeave,
}) => {
	const isFullscreen = presentationState?.isFullscreen ?? false;
	const borderPalette = getLocationBorderPalette(cell.point.themeColor);
	
	// Circle radius: normal state uses targetRadius, fullscreen expands to diagonal
	const fullscreenRadius = getFullscreenExpansionRadius(mapBounds);
	const displayRadius = isFullscreen ? fullscreenRadius : targetRadius;
	
	// Emphasis and styling
	const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
	const outlineStrokeWidth = 5.2 + emphasis * 0.8;
	const fullscreenOutlineStrokeWidth = 6;
	const shadeOpacity = 0.28 - emphasis * 0.06;
	const fullscreenShadeOpacity = 0.22;
	
	// Background image sizing and positioning
	const focalX = clamp(cell.point.focalPoint.x, 0, 1);
	const focalY = clamp(cell.point.focalPoint.y, 0, 1);
	const referenceDiameter = Math.max(1, displayRadius * 2);
	const backgroundZoom = isFullscreen ? BACKGROUND_FULLSCREEN_ZOOM : BACKGROUND_LOCKED_ZOOM;
	const backgroundWidth = referenceDiameter * backgroundZoom;
	const backgroundHeight = referenceDiameter * backgroundZoom;
	const backgroundX = cell.point.x - (backgroundWidth / 2) + (backgroundWidth / 2) * (focalX - 0.5) * 2;
	const backgroundY = cell.point.y - (backgroundHeight / 2) + (backgroundHeight / 2) * (focalY - 0.5) * 2;

	return (
		<g>
			{/* Background image as SVG image element */}
			<motion.image
				href={cell.point.imageUrl}
				x={backgroundX}
				y={backgroundY}
				width={backgroundWidth}
				height={backgroundHeight}
				preserveAspectRatio="xMidYMid slice"
				clipPath={`url(#${cell.clipPathId})`}
				animate={{
					filter: isFullscreen ? "blur(6px)" : "blur(0px)",
					opacity: isFullscreen ? 0.72 : 1,
				}}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			
			{/* Background fill/shade */}
			<motion.circle
				cx={cell.point.x}
				cy={cell.point.y}
				r={displayRadius}
				fill={`rgba(10, 26, 39, ${isFullscreen ? fullscreenShadeOpacity : shadeOpacity})`}
				animate={{ opacity: isFullscreen ? 1 : 1 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			
			{/* Gradient overlay for fullscreen - rendered as SVG element */}
			<motion.circle
				cx={cell.point.x}
				cy={cell.point.y}
				r={displayRadius}
				fill="url(#fullscreen-gradient)"
				animate={{ opacity: isFullscreen ? 1 : 0 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			
			{/* Border outline */}
			<motion.circle
				cx={cell.point.x}
				cy={cell.point.y}
				r={displayRadius}
				fill="none"
				stroke={borderPalette.stroke}
				strokeWidth={isFullscreen ? fullscreenOutlineStrokeWidth : outlineStrokeWidth}
				animate={{ opacity: isFullscreen ? 1 : 1 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			
			{/* Regular polygon rendering for non-fullscreen */}
			<motion.path
				d={cell.path}
				fill={`rgba(10, 26, 39, ${shadeOpacity})`}
				animate={{ opacity: isFullscreen ? 0 : 1 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			<motion.path
				d={cell.path}
				fill="none"
				stroke={borderPalette.stroke}
				strokeWidth={outlineStrokeWidth}
				strokeLinejoin="round"
				clipPath={`url(#${cell.clipPathId})`}
				animate={{ opacity: isFullscreen ? 0 : 1 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			
			{/* Hit target for polygon */}
			<path
				d={cell.path}
				fill="rgba(255,255,255,0)"
				style={{ pointerEvents: isFullscreen ? "none" : "all" }}
				data-cell-id={cell.point.id}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
			
			{/* Hit target for fullscreen circle */}
			<motion.circle
				cx={cell.point.x}
				cy={cell.point.y}
				r={displayRadius}
				fill="rgba(255,255,255,0)"
				data-cell-id={cell.point.id}
				animate={{ opacity: isFullscreen ? 1 : 0 }}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: isFullscreen ? "all" : "none" }}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
		</g>
	);
};