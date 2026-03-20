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

const getFullscreenSquareBounds = (mapBounds: MapBounds) => {
	const size = Math.min(mapBounds.width, mapBounds.height);
	return {
		x: (mapBounds.width - size) / 2,
		y: (mapBounds.height - size) / 2,
		width: size,
		height: size,
	};
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
	const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
	const outlineStrokeWidth = 5.2 + emphasis * 0.8;
	const fullscreenOutlineStrokeWidth = 6;
	const shadeOpacity = 0.28 - emphasis * 0.06;
	const fullscreenShadeOpacity = 0.22;
	const focalX = clamp(cell.point.focalPoint.x, 0, 1);
	const focalY = clamp(cell.point.focalPoint.y, 0, 1);
	const backgroundPosition = `${focalX * 100}% ${focalY * 100}%`;
	const polygonClipPath = getPolygonClipPath(cell.polygon, cell.bounds);
	const fullscreenBounds = getFullscreenSquareBounds(mapBounds);
	const frameBounds = isFullscreen ? fullscreenBounds : cell.bounds;
	const referenceDiameter = Math.max(1, targetRadius * 2);
	const lockedBackgroundWidth = referenceDiameter * BACKGROUND_LOCKED_ZOOM;
	const lockedBackgroundHeight = referenceDiameter * BACKGROUND_LOCKED_ZOOM;
	const backgroundWidth = Math.max(frameBounds.width, lockedBackgroundWidth);
	const backgroundHeight = Math.max(frameBounds.height, lockedBackgroundHeight);
	const backgroundLeft = (frameBounds.width - backgroundWidth) * focalX;
	const backgroundTop = (frameBounds.height - backgroundHeight) * focalY;

	return (
		<g>
			<motion.foreignObject
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				animate={{
					x: frameBounds.x,
					y: frameBounds.y,
					width: frameBounds.width,
					height: frameBounds.height,
				}}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none", overflow: "visible" }}
			>
				<motion.div
					animate={{
						clipPath: isFullscreen ? "inset(0% 0% 0% 0%)" : polygonClipPath,
						borderRadius: isFullscreen ? "0px" : "18px",
					}}
					transition={CELL_TRANSITION}
					style={{
						width: "100%",
						height: "100%",
						position: "relative",
						overflow: "hidden",
						backgroundColor: "rgba(14, 30, 43, 0.92)",
					}}
				>
					<motion.div
						animate={{
							filter: isFullscreen ? "blur(6px)" : "blur(0px)",
							opacity: isFullscreen ? 0.72 : 1,
						}}
						transition={CELL_TRANSITION}
						style={{
							position: "absolute",
							left: backgroundLeft,
							top: backgroundTop,
							width: backgroundWidth,
							height: backgroundHeight,
							backgroundImage: `url(${cell.point.imageUrl})`,
							backgroundPosition,
							backgroundRepeat: "no-repeat",
							backgroundSize: "cover",
						}}
					/>
					<motion.div
						animate={{ opacity: isFullscreen ? 1 : 0 }}
						transition={CELL_TRANSITION}
						style={{
							position: "absolute",
							inset: 0,
							background: "linear-gradient(180deg, rgba(4, 12, 22, 0.38) 0%, rgba(4, 12, 22, 0.55) 100%)",
							pointerEvents: "none",
						}}
					/>
				</motion.div>
			</motion.foreignObject>
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
			<motion.rect
				initial={false}
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				fill={`rgba(10, 26, 39, ${fullscreenShadeOpacity})`}
				stroke={borderPalette.stroke}
				strokeWidth={fullscreenOutlineStrokeWidth}
				animate={{
					x: frameBounds.x,
					y: frameBounds.y,
					width: frameBounds.width,
					height: frameBounds.height,
					opacity: isFullscreen ? 1 : 0,
				}}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: "none" }}
			/>
			<path
				d={cell.path}
				fill="rgba(255,255,255,0)"
				style={{ pointerEvents: isFullscreen ? "none" : "all" }}
				data-cell-id={cell.point.id}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
			<motion.rect
				initial={false}
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				fill="rgba(255,255,255,0)"
				data-cell-id={cell.point.id}
				animate={{
					x: frameBounds.x,
					y: frameBounds.y,
					width: frameBounds.width,
					height: frameBounds.height,
					opacity: isFullscreen ? 1 : 0,
				}}
				transition={CELL_TRANSITION}
				style={{ pointerEvents: isFullscreen ? "all" : "none" }}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
		</g>
	);
};