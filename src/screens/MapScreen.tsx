import { FC, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { Location } from "../content/Location";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Box, Typography } from "@mui/material";
import { ArrowBack, DeleteSweep } from "@mui/icons-material";
import { motion } from "framer-motion";
import { Button } from "./UiComponents";
import { useTooltip } from "./TooltipContext";
import * as d3WeightedVoronoiModule from "d3-weighted-voronoi";

interface MapScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
}

interface VoronoiPoint {
	id: string;
	name: string;
	x: number;
	y: number;
	weight: number;
	radius: number;
	imageUrl: string;
	themeColor: string;
}

interface VoronoiCell {
	point: VoronoiPoint;
	path: string;
	polygon: number[][];
	patternId: string;
	clipPathId: string;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;
const MIN_CELL_RADIUS = 40;
const MAX_CELL_RADIUS = 300;
const POINT_TRANSITION_MS = 700;
const PULSE_TICK_MS = 50;
const HOVER_TARGET_RADIUS_PAD = 26;
const HOVER_CELL_SCALE = 1.06;
const HOVER_RADIUS_INFLUENCE_MULTIPLIER = 1.1;
const SHOW_HOVER_DEBUG = true;

const testImagePool = [
	"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
	"https://media.charhub.io/d41042d5-5860-4f76-85ac-885e65e92c2b/95fdc548-1c75-4101-a62e-65fc90a97437.png",
];

type DefaultLocationSeed = {
	id: string;
	name: string;
	description: string;
	weight: number;
	imageUrl: string;
	center: { x: number; y: number };
	themeColor: string;
};

// Customize this list to define which locations are restored when the map is cleared.
// Default list are locations in the city of Ardeia, which is the central location of the game. Other areas will be more dynamic.
// Ardeia is a fantasy sci-fi city with a mixture of heavy gothic architecture mixed with overgrown greenery and archaically high-tech machinery that feels ancient and alien at once.
const DEFAULT_ATLAS_LOCATIONS: DefaultLocationSeed[] = [
	{
		id: "ardeia-streets",
		name: "Streets of Ardeia",
		description: "",
		weight: 1,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/65f8275a-a798-4c0e-b5ea-22b7779c7b52/52c92a1a-e727-4419-af67-40e9cc5635e9.png',
		center: { x: 0.5, y: 0.5 },
		themeColor: "#5aa3d8",
	},
	{
		id: "ardeia-library",
		name: "The Library",
		description: "",
		weight: 0.5,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/959a3d92-2cff-48c9-bb6a-0d5dd9cef2e5/d66d42be-516d-4fb4-91b0-b3aae9ee1a2a.png',
		center: { x: 0.4, y: 0.45 },
		themeColor: "#d8a45a",
	},
	{
		id: "ardeia-temple",
		name: "The Temple",
		description: "",
		weight: 0.5,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/382bbbd6-5080-4c72-9c28-641efcbc87c0/84066e0e-9e62-4001-aaa1-a78c144fddef.png',
		center: { x: 0.45, y: 0.6 },
		themeColor: "#d86f5a",
	},
	{
		id: "ardeia-gardens",
		name: "The Gardens",
		description: "",
		weight: 0.5,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/1b1d80c6-08e6-42a6-9a94-3e643304b152/81a86b0f-4f6e-445c-afdb-db019e37ab0c.png',
		center: { x: 0.6, y: 0.55 },
		themeColor: "#7ecfbe",
	},
	{
		id: "ardeia-plaza",
		name: "The Plaza",
		description: "",
		weight: 0.5,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/0d9d311c-9f3b-42b2-854b-894f4534c24c/f645dd78-90f7-4813-a4b1-566599446aaf.png',
		center: { x: 0.55, y: 0.4 },
		themeColor: "#7ecfbe",
	},
];

const createDefaultAtlas = () => {
	const atlas: Record<string, Location> = {};
	for (const seed of DEFAULT_ATLAS_LOCATIONS) {
		const location = new Location(seed);
		atlas[location.id] = location;
	}
	return atlas;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const hashString = (value: string) => {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
};

const getPulseProfile = (id: string) => {
	const hash = hashString(id);
	const phase = ((hash & 0xffff) / 0xffff) * Math.PI * 2;
	const frequency = 0.05 + (((hash >> 16) & 0xff) / 255) * 0.09;
	const amplitude = 0.006 + (((hash >> 24) & 0xff) / 255) * 0.014;
	return { phase, frequency, amplitude };
};

const getRadiusFromWeight = (weight: number) => {
	const normalizedWeight = clamp(weight, 0.05, 4);
	const derivedRadius = 70 + Math.pow(normalizedWeight, 0.9) * 48;
	return clamp(derivedRadius, MIN_CELL_RADIUS, MAX_CELL_RADIUS);
};

const normalizeCoordinate = (value: number, max: number) => {
	if (value >= 0 && value <= 1) {
		return value * max;
	}
	if (value >= 0 && value <= 100) {
		return (value / 100) * max;
	}
	return clamp(value, 0, max);
};

const asHexColor = (value: string) => {
	const normalized = (value ?? 'fff').trim();
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
		outerStroke: colorWithAlpha(normalizedThemeColor, 0.92, "rgba(215, 190, 122, 0.92)"),
		innerStroke: colorWithAlpha(normalizedThemeColor, 0.72, "rgba(215, 190, 122, 0.72)"),
		gapStroke: "rgba(3, 11, 19, 0.9)",
	};
};

const toPolygonPath = (polygon: number[][]) => {
	if (!polygon || polygon.length < 3) {
		return "";
	}
	return polygon
		.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
		.join(" ") + " Z";
};

const getPolygonCentroid = (polygon: number[][]) => {
	if (polygon.length === 0) {
		return [0, 0] as number[];
	}
	let x = 0;
	let y = 0;
	for (const point of polygon) {
		x += point[0];
		y += point[1];
	}
	return [x / polygon.length, y / polygon.length] as number[];
};

const isPointInsidePolygon = (x: number, y: number, polygon: number[][]) => {
	if (polygon.length < 3) {
		return false;
	}

	let isInside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
		const xi = polygon[i][0];
		const yi = polygon[i][1];
		const xj = polygon[j][0];
		const yj = polygon[j][1];

		const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
		if (intersects) {
			isInside = !isInside;
		}
	}

	return isInside;
};

const lineIntersection = (a: number[], b: number[], c: number[], d: number[]) => {
	const [x1, y1] = a;
	const [x2, y2] = b;
	const [x3, y3] = c;
	const [x4, y4] = d;

	const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
	if (Math.abs(denominator) < 1e-8) {
		return b;
	}

	const determinant1 = x1 * y2 - y1 * x2;
	const determinant2 = x3 * y4 - y3 * x4;
	const px = (determinant1 * (x3 - x4) - (x1 - x2) * determinant2) / denominator;
	const py = (determinant1 * (y3 - y4) - (y1 - y2) * determinant2) / denominator;
	return [px, py] as number[];
};

const clipPolygonWithConvex = (subjectPolygon: number[][], clipPolygon: number[][]) => {
	if (subjectPolygon.length < 3 || clipPolygon.length < 3) {
		return [] as number[][];
	}

	let outputList = subjectPolygon;
	const clipCentroid = getPolygonCentroid(clipPolygon);

	for (let i = 0; i < clipPolygon.length; i += 1) {
		const clipStart = clipPolygon[i];
		const clipEnd = clipPolygon[(i + 1) % clipPolygon.length];
		const interiorCross =
			(clipEnd[0] - clipStart[0]) * (clipCentroid[1] - clipStart[1]) -
			(clipEnd[1] - clipStart[1]) * (clipCentroid[0] - clipStart[0]);
		const interiorSign = interiorCross >= 0 ? 1 : -1;
		const inputList = outputList;
		outputList = [];

		if (inputList.length === 0) {
			break;
		}

		const isInside = (point: number[]) => {
			const cross =
				(clipEnd[0] - clipStart[0]) * (point[1] - clipStart[1]) -
				(clipEnd[1] - clipStart[1]) * (point[0] - clipStart[0]);
			return interiorSign > 0 ? cross >= -1e-8 : cross <= 1e-8;
		};

		let previousPoint = inputList[inputList.length - 1];
		for (const currentPoint of inputList) {
			const currentInside = isInside(currentPoint);
			const previousInside = isInside(previousPoint);

			if (currentInside) {
				if (!previousInside) {
					outputList.push(lineIntersection(previousPoint, currentPoint, clipStart, clipEnd));
				}
				outputList.push(currentPoint);
			} else if (previousInside) {
				outputList.push(lineIntersection(previousPoint, currentPoint, clipStart, clipEnd));
			}

			previousPoint = currentPoint;
		}
	}

	return outputList;
};

const createCirclePolygon = (cx: number, cy: number, radius: number, segments = 32) => {
	const points: number[][] = [];
	for (let i = 0; i < segments; i += 1) {
		const angle = (i / segments) * Math.PI * 2;
		points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
	}
	return points;
};

const getPowerWeight = (point: VoronoiPoint) => {
	const radius = Math.max(1, point.radius);
	// Power-diagram weights are radius-squared; this moves borders toward smaller cells.
	return radius * radius;
};

const getSaveForMutation = (stage: Stage) => {
	const slot = stage.saveData.lastSaveSlot;
	if (!stage.saveData.saves[slot]) {
		stage.saveData.saves[slot] = stage.getSave();
	}
	return stage.saveData.saves[slot]!;
};

export const MapScreen: FC<MapScreenProps> = ({ stage, setScreenType }) => {
	const [revision, setRevision] = useState(0);
	const [pulseClock, setPulseClock] = useState(() => performance.now());
	const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
	const [hoverDebug, setHoverDebug] = useState<{
		x: number;
		y: number;
		candidateCellId: string | null;
		source: "none" | "hit-path" | "polygon" | "radius";
	}>({ x: 0, y: 0, candidateCellId: null, source: "none" });
	const { setTooltip, clearTooltip } = useTooltip();
	const animatedPointsRef = useRef<VoronoiPoint[]>([]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setScreenType(ScreenType.MENU);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [setScreenType]);

	const targetPoints = useMemo(() => {
		const save = stage().getSave();
		const atlasEntries = Object.values(save.atlas as Record<string, Location>);
		return atlasEntries.map((location) => {
			const weight = Math.max(0.05, location.weight || 1);

			return {
				id: location.id,
				name: location.name || "Unnamed Location",
				x: normalizeCoordinate(location.center?.x ?? 0.5, MAP_WIDTH),
				y: normalizeCoordinate(location.center?.y ?? 0.5, MAP_HEIGHT),
				weight,
				radius: getRadiusFromWeight(weight),
				imageUrl: location.imageUrl,
				themeColor: location.themeColor,
			};
		});
	}, [stage, revision]);

	const [animatedPoints, setAnimatedPoints] = useState<VoronoiPoint[]>(targetPoints);

	useEffect(() => {
		animatedPointsRef.current = animatedPoints;
	}, [animatedPoints]);

	useEffect(() => {
		if (targetPoints.length === 0) {
			animatedPointsRef.current = [];
			setAnimatedPoints([]);
			return;
		}

		const previousById = new Map(animatedPointsRef.current.map((point) => [point.id, point]));
		const startPoints = targetPoints.map((targetPoint) => {
			const previousPoint = previousById.get(targetPoint.id);
			if (previousPoint) {
				return previousPoint;
			}
			return {
				...targetPoint,
				weight: Math.max(0.05, targetPoint.weight * 0.4),
				radius: clamp(targetPoint.radius * 0.45, MIN_CELL_RADIUS, MAX_CELL_RADIUS),
			};
		});

		let frameId = 0;
		const startTime = performance.now();

		const animate = (now: number) => {
			const rawProgress = clamp((now - startTime) / POINT_TRANSITION_MS, 0, 1);
			const easedProgress = 1 - Math.pow(1 - rawProgress, 3);

			const nextPoints = targetPoints.map((targetPoint, index) => {
				const startPoint = startPoints[index];
				return {
					...targetPoint,
					x: lerp(startPoint.x, targetPoint.x, easedProgress),
					y: lerp(startPoint.y, targetPoint.y, easedProgress),
					weight: Math.max(0.05, lerp(startPoint.weight, targetPoint.weight, easedProgress)),
					radius: clamp(
						lerp(startPoint.radius, targetPoint.radius, easedProgress),
						MIN_CELL_RADIUS,
						MAX_CELL_RADIUS,
					),
				};
			});

			animatedPointsRef.current = nextPoints;
			setAnimatedPoints(nextPoints);

			if (rawProgress < 1) {
				frameId = window.requestAnimationFrame(animate);
			}
		};

		frameId = window.requestAnimationFrame(animate);
		return () => window.cancelAnimationFrame(frameId);
	}, [targetPoints]);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setPulseClock(performance.now());
		}, PULSE_TICK_MS);
		return () => window.clearInterval(interval);
	}, []);

	useEffect(() => {
		return () => {
			clearTooltip();
		};
	}, [clearTooltip]);

	useEffect(() => {
		if (!hoveredCellId) {
			clearTooltip();
			return;
		}

		const hoveredPoint = targetPoints.find((point) => point.id === hoveredCellId);
		if (!hoveredPoint) {
			setHoveredCellId(null);
			clearTooltip();
			return;
		}

		setTooltip(hoveredPoint.name);
	}, [hoveredCellId, targetPoints, setTooltip, clearTooltip]);

	const pulsedPoints = useMemo(() => {
		const timeSeconds = pulseClock / 1000;
		return animatedPoints.map((point) => {
			const pulse = getPulseProfile(point.id);
			const wave = Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase);
			const secondaryWave = Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase + 1.1);
			const pulseRadius = clamp(
				point.radius * (1 + secondaryWave * pulse.amplitude * 0.35),
				MIN_CELL_RADIUS,
				MAX_CELL_RADIUS,
			);
			const influencedRadius =
				hoveredCellId === point.id
					? clamp(pulseRadius * HOVER_RADIUS_INFLUENCE_MULTIPLIER, MIN_CELL_RADIUS, MAX_CELL_RADIUS)
					: pulseRadius;

			return {
				...point,
				weight: Math.max(0.05, point.weight * (1 + wave * pulse.amplitude)),
				radius: influencedRadius,
			};
		});
	}, [animatedPoints, pulseClock, hoveredCellId]);

	const voronoiCells = useMemo(() => {
		if (pulsedPoints.length === 0) {
			return [] as VoronoiCell[];
		}

		const weightedVoronoiFactory = (d3WeightedVoronoiModule as any).weightedVoronoi;
		if (!weightedVoronoiFactory) {
			return [] as VoronoiCell[];
		}

		const weightedVoronoi = weightedVoronoiFactory()
			.x((d: VoronoiPoint) => d.x)
			.y((d: VoronoiPoint) => d.y)
			.weight((d: VoronoiPoint) => getPowerWeight(d))
			.clip([
				[0, 0],
				[MAP_WIDTH, 0],
				[MAP_WIDTH, MAP_HEIGHT],
				[0, MAP_HEIGHT],
			]);

		const mapBoundsPolygon = [
			[0, 0],
			[MAP_WIDTH, 0],
			[MAP_WIDTH, MAP_HEIGHT],
			[0, MAP_HEIGHT],
		] as number[][];

		const polygons = weightedVoronoi(pulsedPoints) as Array<
			number[][] & {
				site?: { originalObject?: VoronoiPoint };
			}
		>;

		const cells: VoronoiCell[] = [];
		for (let index = 0; index < polygons.length; index += 1) {
			const polygon = polygons[index];
			if (!polygon || polygon.length < 3) {
				continue;
			}

			const point = polygon.site?.originalObject || pulsedPoints[index];
			if (!point) {
				continue;
			}

			const radiusPolygon = createCirclePolygon(point.x, point.y, point.radius);
			let clippedPolygon = clipPolygonWithConvex(polygon, radiusPolygon);

			if (clippedPolygon.length < 3) {
				clippedPolygon = clipPolygonWithConvex(radiusPolygon, mapBoundsPolygon);
			}

			const path = toPolygonPath(clippedPolygon);
			if (!path) {
				continue;
			}

			cells.push({
				point,
				path,
				polygon: clippedPolygon,
				patternId: `location-pattern-${point.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
				clipPathId: `location-clip-${point.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
			});
		}

		return cells;
	}, [pulsedPoints]);

	const hasAtlasLocations = targetPoints.length > 0;

	const addRandomLocation = (event: MouseEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;

		const save = getSaveForMutation(stage());
		const locationCount = Object.keys(save.atlas).length;
		const randomWeight = Number((0.25 + Math.random() * 2.75).toFixed(2));
		const randomImageUrl = testImagePool[Math.floor(Math.random() * testImagePool.length)];

		const newLocation = new Location({
			name: `Test Location ${locationCount + 1}`,
			description: "Generated from MapScreen click for Voronoi testing.",
			weight: randomWeight,
			imageUrl: randomImageUrl,
			center: {
				x: Number((x / MAP_WIDTH).toFixed(3)),
				y: Number((y / MAP_HEIGHT).toFixed(3)),
			},
		});

		(save.atlas as Record<string, Location>)[newLocation.id] = newLocation;
		stage().saveGame();
		setRevision((value) => value + 1);
		stage().showPriorityMessage(
			`Added ${newLocation.name} (weight ${randomWeight}, radius auto-derived).`,
			undefined,
			2200,
		);
	};

	const getMapPointerCoordinates = (event: PointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
		return { x, y };
	};

	const handleMapPointerMove = (event: PointerEvent<SVGSVGElement>) => {
		if (!voronoiCells.length) {
			setHoveredCellId((current) => (current ? null : current));
			setHoverDebug((current) => ({ ...current, candidateCellId: null, source: "none" }));
			return;
		}

		const { x, y } = getMapPointerCoordinates(event);
		const eventTarget = event.target as Element | null;
		const targetCellId = eventTarget?.getAttribute("data-cell-id") ?? null;

		if (targetCellId) {
			setHoverDebug({
				x: Math.round(x),
				y: Math.round(y),
				candidateCellId: targetCellId,
				source: "hit-path",
			});
			setHoveredCellId((current) => (current === targetCellId ? current : targetCellId));
			return;
		}

		let hoveredCell: VoronoiCell | null = null;

		for (const cell of voronoiCells) {
			if (isPointInsidePolygon(x, y, cell.polygon)) {
				hoveredCell = cell;
				break;
			}
		}

		if (!hoveredCell) {
			let bestMatch: { id: string; distanceSq: number } | null = null;
			for (const cell of voronoiCells) {
				const dx = x - cell.point.x;
				const dy = y - cell.point.y;
				const distanceSq = dx * dx + dy * dy;
				const targetRadius = cell.point.radius + HOVER_TARGET_RADIUS_PAD;
				if (distanceSq <= targetRadius * targetRadius) {
					if (!bestMatch || distanceSq < bestMatch.distanceSq) {
						bestMatch = { id: cell.point.id, distanceSq };
					}
				}
			}

			const nextHoveredCellId = bestMatch?.id ?? null;
			setHoverDebug({
				x: Math.round(x),
				y: Math.round(y),
				candidateCellId: nextHoveredCellId,
				source: nextHoveredCellId ? "radius" : "none",
			});
			setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
			return;
		}

		const nextHoveredCellId = hoveredCell.point.id;
		setHoverDebug({
			x: Math.round(x),
			y: Math.round(y),
			candidateCellId: nextHoveredCellId,
			source: "polygon",
		});
		setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
	};

	const handleMapPointerLeave = () => {
		setHoveredCellId((current) => (current ? null : current));
		setHoverDebug((current) => ({ ...current, candidateCellId: null, source: "none" }));
	};

	const handleCellPointerEnter = (cellId: string) => {
		setHoveredCellId((current) => (current === cellId ? current : cellId));
	};

	const clearLocations = () => {
		const save = getSaveForMutation(stage());
		const atlas = save.atlas as Record<string, Location>;
		const previousCount = Object.keys(atlas).length;
		const defaultAtlas = createDefaultAtlas();
		const defaultCount = Object.keys(defaultAtlas).length;

		save.atlas = defaultAtlas;

		stage().saveGame();
		setRevision((value) => value + 1);
		stage().showPriorityMessage(
			previousCount === 0
				? `Initialized atlas with ${defaultCount} default locations.`
				: `Reset atlas from ${previousCount} to ${defaultCount} default locations.`,
			undefined,
			2200,
		);
	};

	return (
		<BlurredBackground
			imageUrl="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80"
			overlay="linear-gradient(130deg, rgba(5, 24, 34, 0.78) 0%, rgba(18, 47, 32, 0.72) 50%, rgba(37, 24, 57, 0.78) 100%)"
		>
			<Box
				sx={{
					width: "100vw",
					height: "100vh",
					boxSizing: "border-box",
					padding: { xs: "14px", md: "20px" },
					display: "flex",
					flexDirection: "column",
					gap: 2,
				}}
			>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 2,
						flexWrap: "wrap",
					}}
				>
					<Box
						sx={{
							display: "flex",
							gap: 1,
							flexWrap: "wrap",
						}}
					>
						<Button
							variant="menu"
							onClick={() => setScreenType(ScreenType.MENU)}
							onMouseEnter={() => setTooltip("Return to menu", ArrowBack)}
							onMouseLeave={clearTooltip}
							style={{
								minWidth: "150px",
								fontSize: "14px",
							}}
						>
							Back to Menu
						</Button>

						<Button
							variant="menu"
							onClick={clearLocations}
							onMouseEnter={() => setTooltip("Reset atlas to default locations", DeleteSweep)}
							onMouseLeave={clearTooltip}
							style={{
								minWidth: "160px",
								fontSize: "14px",
								background: "linear-gradient(180deg, rgba(122, 33, 33, 0.92), rgba(88, 19, 19, 0.95))",
								borderColor: "rgba(255, 120, 120, 0.35)",
							}}
						>
							Reset Locations
						</Button>
					</Box>

					<Typography
						sx={{
							color: "#f4f4f4",
							textShadow: "0 2px 8px rgba(0,0,0,0.6)",
							fontSize: { xs: "0.85rem", md: "1rem" },
						}}
					>
						Click anywhere in the map to generate a new test location.
					</Typography>
				</Box>

				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, ease: "easeOut" }}
					style={{
						flex: 1,
						minHeight: 0,
						borderRadius: 18,
						overflow: "hidden",
						border: "1px solid rgba(255,255,255,0.15)",
						boxShadow: "0 10px 40px rgba(0,0,0,0.42)",
						background: "rgba(0,0,0,0.24)",
					}}
				>
					<svg
						width="100%"
						height="100%"
						viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
						preserveAspectRatio="none"
						onClick={addRandomLocation}
						onPointerMove={handleMapPointerMove}
						onPointerLeave={handleMapPointerLeave}
						style={{ cursor: "crosshair", display: "block" }}
					>
						<rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="rgba(2,10,18,0.6)" />

						<defs>
							{voronoiCells.map((cell) => (
								<pattern
									key={cell.patternId}
									id={cell.patternId}
									patternUnits="objectBoundingBox"
									width="1"
									height="1"
								>
									<image
										href={cell.point.imageUrl || testImagePool[0]}
										x={0}
										y={0}
										width={MAP_WIDTH}
										height={MAP_HEIGHT}
										preserveAspectRatio="xMidYMid slice"
										opacity={0.92}
									/>
								</pattern>
							))}
								{voronoiCells.map((cell) => (
									<clipPath key={cell.clipPathId} id={cell.clipPathId} clipPathUnits="userSpaceOnUse">
										<path d={cell.path} />
									</clipPath>
								))}
						</defs>

						{voronoiCells.map((cell) => {
							const borderPalette = getLocationBorderPalette(cell.point.themeColor);
							const isHovered = hoveredCellId === cell.point.id;
							const hoverScale = isHovered ? HOVER_CELL_SCALE : 1;
							const transformOrigin = `${cell.point.x.toFixed(2)} ${cell.point.y.toFixed(2)}`;

							return (
								<g
									key={cell.point.id}
									transform={`translate(${cell.point.x.toFixed(2)} ${cell.point.y.toFixed(2)}) scale(${hoverScale}) translate(${-cell.point.x.toFixed(2)} ${-cell.point.y.toFixed(2)})`}
									style={{
										transformOrigin,
										transition: "transform 140ms ease-out",
									}}
								>
									<path
										d={cell.path}
										fill={`url(#${cell.patternId})`}
										style={{ transition: "opacity 180ms ease", pointerEvents: "none" }}
									/>
									<path d={cell.path} fill="rgba(10, 26, 39, 0.28)" style={{ pointerEvents: "none" }} />
									<path
										d={cell.path}
										fill="none"
										stroke={borderPalette.outerStroke}
										strokeWidth={isHovered ? 5.4 : 4.8}
										strokeLinejoin="round"
										clipPath={`url(#${cell.clipPathId})`}
										style={{ pointerEvents: "none" }}
									/>
									<path
										d={cell.path}
										fill="none"
										stroke={borderPalette.gapStroke}
										strokeWidth={2.8}
										strokeLinejoin="round"
										clipPath={`url(#${cell.clipPathId})`}
										style={{ pointerEvents: "none" }}
									/>
									<path
										d={cell.path}
										fill="none"
										stroke={borderPalette.innerStroke}
										strokeWidth={isHovered ? 1.6 : 1.2}
										strokeLinejoin="round"
										clipPath={`url(#${cell.clipPathId})`}
										style={{ pointerEvents: "none" }}
									/>
									<circle
										cx={cell.point.x}
										cy={cell.point.y}
										r={4.2}
										fill="rgba(255,255,255,0.88)"
										style={{ pointerEvents: "none" }}
									/>
									<path
										d={cell.path}
										fill="rgba(255,255,255,0)"
										style={{ pointerEvents: "all" }}
										data-cell-id={cell.point.id}
										onPointerEnter={() => handleCellPointerEnter(cell.point.id)}
										onPointerMove={() => handleCellPointerEnter(cell.point.id)}
									/>
								</g>
							);
						})}

						{SHOW_HOVER_DEBUG && (
							<g style={{ pointerEvents: "none" }}>
								<rect x={12} y={12} width={370} height={118} rx={8} fill="rgba(0,0,0,0.62)" stroke="rgba(255,255,255,0.22)" />
								<text x={24} y={36} fill="rgba(255,255,255,0.92)" style={{ fontSize: "15px", fontWeight: 700 }}>
									Hover Debug
								</text>
								<text x={24} y={58} fill="rgba(210,231,255,0.95)" style={{ fontSize: "13px" }}>
									{`Pointer: (${hoverDebug.x}, ${hoverDebug.y})`}
								</text>
								<text x={24} y={78} fill="rgba(210,231,255,0.95)" style={{ fontSize: "13px" }}>
									{`Hovered: ${hoveredCellId || "none"}`}
								</text>
								<text x={24} y={98} fill="rgba(210,231,255,0.95)" style={{ fontSize: "13px" }}>
									{`Candidate: ${hoverDebug.candidateCellId || "none"}`}
								</text>
								<text x={24} y={118} fill="rgba(210,231,255,0.95)" style={{ fontSize: "13px" }}>
									{`Source: ${hoverDebug.source}`}
								</text>
							</g>
						)}

						{!hasAtlasLocations && (
							<text
								x={MAP_WIDTH / 2}
								y={MAP_HEIGHT / 2}
								textAnchor="middle"
								fill="rgba(255,255,255,0.8)"
								style={{ fontSize: "26px", fontWeight: 500 }}
							>
								Atlas is empty. Click to add the first location.
							</text>
						)}

						{hasAtlasLocations && voronoiCells.length === 0 && (
							<text
								x={MAP_WIDTH / 2}
								y={MAP_HEIGHT / 2}
								textAnchor="middle"
								fill="rgba(255,255,255,0.75)"
								style={{ fontSize: "20px", fontWeight: 500 }}
							>
								Locations exist, but no renderable cell geometry was produced.
							</text>
						)}
					</svg>
				</motion.div>
			</Box>
		</BlurredBackground>
	);
};
