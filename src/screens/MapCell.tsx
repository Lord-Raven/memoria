import { FC } from "react";

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
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const BACKGROUND_LOCKED_ZOOM = 1.5;

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
}) => {
	const borderPalette = getLocationBorderPalette(cell.point.themeColor);
	const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
	const outlineStrokeWidth = 1.8 + emphasis * 0.4;
	const shadeOpacity = 0.28 - emphasis * 0.06;
	const focalX = clamp(cell.point.focalPoint.x, 0, 1);
	const focalY = clamp(cell.point.focalPoint.y, 0, 1);
	const compensationX = clamp(backgroundAspectCompensationX, 1e-3, 1000);
	const compensationY = clamp(backgroundAspectCompensationY, 1e-3, 1000);
	const backgroundPosition = `${focalX * 100}% ${focalY * 100}%`;
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

	return (
		<g style={{ opacity, transition: "opacity 260ms ease" }}>
			<foreignObject
				x={cell.bounds.x}
				y={cell.bounds.y}
				width={cell.bounds.width}
				height={cell.bounds.height}
				clipPath={`url(#${cell.clipPathId})`}
				style={{ pointerEvents: "none" }}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						position: "relative",
						overflow: "hidden",
						backgroundColor: "rgba(14, 30, 43, 0.92)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: backgroundLeft,
							top: backgroundTop,
							width: backgroundRenderWidth,
							height: backgroundRenderHeight,
							backgroundImage: `url(${cell.point.imageUrl})`,
							backgroundPosition,
							backgroundRepeat: "no-repeat",
							backgroundSize: "cover",
							transform: `scale(${compensationX}, ${compensationY})`,
							transformOrigin: `${focalX * 100}% ${focalY * 100}%`,
							filter: `blur(${backgroundBlurPx}px)`,
							transition: "filter 260ms ease, opacity 180ms ease",
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: 0,
							backgroundColor: `rgba(4, 10, 16, ${clamp(backgroundDimOpacity, 0, 0.7)})`,
							transition: "background-color 260ms ease",
						}}
					/>
				</div>
			</foreignObject>
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