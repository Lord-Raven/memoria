import { FC } from "react";

export interface MapCellPoint {
	id: string;
	x: number;
	y: number;
	radius: number;
	imageUrl: string;
	themeColor: string;
}

export interface MapCellData {
	point: MapCellPoint;
	path: string;
	patternId: string;
	clipPathId: string;
}

interface MapCellProps {
	cell: MapCellData;
	targetRadius: number;
	onPointerEnter: (cellId: string) => void;
	onPointerLeave: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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

export const MapCell: FC<MapCellProps> = ({ cell, targetRadius, onPointerEnter, onPointerLeave }) => {
	const borderPalette = getLocationBorderPalette(cell.point.themeColor);
	const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
	const outlineStrokeWidth = 5.2 + emphasis * 0.8;
	const shadeOpacity = 0.28 - emphasis * 0.06;

	return (
		<g>
			<path
				d={cell.path}
				fill={`url(#${cell.patternId})`}
				style={{ transition: "opacity 180ms ease", pointerEvents: "none" }}
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
			<path
				d={cell.path}
				fill="rgba(255,255,255,0)"
				style={{ pointerEvents: "all" }}
				data-cell-id={cell.point.id}
				onPointerEnter={() => onPointerEnter(cell.point.id)}
				onPointerMove={() => onPointerEnter(cell.point.id)}
				onPointerLeave={onPointerLeave}
			/>
		</g>
	);
};