import { FC, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { Location } from "../content/Location";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Box, IconButton } from "@mui/material";
import { MenuRounded } from "@mui/icons-material";
import { motion } from "framer-motion";
import { ConfirmDialog } from "./UiComponents";
import { useTooltip } from "./TooltipContext";
import { MapCell, MapCellData } from "./MapCell";
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
	focalPoint: { x: number; y: number };
	themeColor: string;
}

interface VoronoiCell extends MapCellData {
	polygon: number[][];
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;
const MIN_CELL_RADIUS = 40;
const MAX_CELL_RADIUS = 300;
const POINT_TRANSITION_MS = 700;
const HOVER_TRANSITION_MS = 240;
const PULSE_TICK_MS = 50;
const HOVER_TARGET_RADIUS_PAD = 26;
const HOVER_RADIUS_INFLUENCE_BOOST = 30;
const OUTSIDE_ID = "__outside__";
const MAP_BACKGROUND_IMAGE = "https://avatars.charhub.io/avatars/uploads/images/gallery/file/5c990a43-3e56-455f-ba19-ba487eec4972/1a9f6a36-676f-4dc1-85ae-29bf7a97e538.png";
const testImagePool = [
	"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
];


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

const normalizeRelativeCoordinate = (value: number | undefined, fallback: number) => {
	if (!Number.isFinite(value)) {
		return clamp(fallback, 0, 1);
	}
	if (value! >= 0 && value! <= 1) {
		return value!;
	}
	if (value! >= 0 && value! <= 100) {
		return value! / 100;
	}
	return clamp(value!, 0, 1);
};

const normalizeRelativePoint = (
	point: { x?: number; y?: number } | undefined,
	fallback: { x: number; y: number } = { x: 0.5, y: 0.5 },
) => ({
	x: normalizeRelativeCoordinate(point?.x, fallback.x),
	y: normalizeRelativeCoordinate(point?.y, fallback.y),
});

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

const getPolygonBounds = (polygon: number[][]) => {
	if (polygon.length === 0) {
		return { x: 0, y: 0, width: 1, height: 1 };
	}

	let minX = polygon[0][0];
	let maxX = polygon[0][0];
	let minY = polygon[0][1];
	let maxY = polygon[0][1];

	for (const [x, y] of polygon) {
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}

	return {
		x: minX,
		y: minY,
		width: Math.max(1, maxX - minX),
		height: Math.max(1, maxY - minY),
	};
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

export const MapScreen: FC<MapScreenProps> = ({ stage, setScreenType }) => {
	const [pulseClock, setPulseClock] = useState(() => performance.now());
	const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
	const { setTooltip, clearTooltip } = useTooltip();
	const animatedPointsRef = useRef<VoronoiPoint[]>([]);
	const hoverIntensityRef = useRef<Record<string, number>>({});
	const [hoverIntensityById, setHoverIntensityById] = useState<Record<string, number>>({});
	const [pendingLocation, setPendingLocation] = useState<{
		name: string;
		isArdeia: boolean;
		locationId?: string;
		outsideSelected: boolean;
	} | null>(null);

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
		const atlasEntries = Object.values(save.atlas as Record<string, Location>).filter(
			(location) => location.discovered,
		);
		return atlasEntries.map((location, index) => {
			const weight = Math.max(0.05, location.weight || 1);
			const focalPoint = normalizeRelativePoint(location.focalPoint, normalizeRelativePoint(location.center));

			return {
				id: location.id,
				name: location.name || "Unnamed Location",
				x: normalizeCoordinate(location.center?.x ?? 0.5, MAP_WIDTH),
				y: normalizeCoordinate(location.center?.y ?? 0.5, MAP_HEIGHT),
				weight,
				radius: getRadiusFromWeight(weight),
				imageUrl: location.imageUrl || testImagePool[index % testImagePool.length],
				focalPoint,
				themeColor: location.themeColor,
			};
		});
	}, [stage]);

	const [animatedPoints, setAnimatedPoints] = useState<VoronoiPoint[]>(targetPoints);

	useEffect(() => {
		animatedPointsRef.current = animatedPoints;
	}, [animatedPoints]);

	useEffect(() => {
		const currentIntensities = hoverIntensityRef.current;
		const pointIds = new Set(targetPoints.map((point) => point.id));
		const nextIntensities: Record<string, number> = {};

		for (const pointId of pointIds) {
			nextIntensities[pointId] = currentIntensities[pointId] ?? 0;
		}

		hoverIntensityRef.current = nextIntensities;
		setHoverIntensityById(nextIntensities);
	}, [targetPoints]);

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
		const pointIds = targetPoints.map((point) => point.id);
		if (pointIds.length === 0) {
			hoverIntensityRef.current = {};
			setHoverIntensityById({});
			return;
		}

		const startValues = hoverIntensityRef.current;
		const targetValues: Record<string, number> = {};
		for (const pointId of pointIds) {
			targetValues[pointId] = pointId === hoveredCellId ? 1 : 0;
		}

		const allSettled = pointIds.every((pointId) => Math.abs((startValues[pointId] ?? 0) - targetValues[pointId]) < 0.001);
		if (allSettled) {
			return;
		}

		let frameId = 0;
		const animationStart = performance.now();

		const animateHoverTransition = (now: number) => {
			const progress = clamp((now - animationStart) / HOVER_TRANSITION_MS, 0, 1);
			const easedProgress = 1 - Math.pow(1 - progress, 3);
			const nextValues: Record<string, number> = {};

			for (const pointId of pointIds) {
				const startValue = startValues[pointId] ?? 0;
				nextValues[pointId] = lerp(startValue, targetValues[pointId], easedProgress);
			}

			hoverIntensityRef.current = nextValues;
			setHoverIntensityById(nextValues);

			if (progress < 1) {
				frameId = window.requestAnimationFrame(animateHoverTransition);
			}
		};

		frameId = window.requestAnimationFrame(animateHoverTransition);
		return () => window.cancelAnimationFrame(frameId);
	}, [hoveredCellId, targetPoints]);

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

		if (hoveredCellId === OUTSIDE_ID) {
			setTooltip("Outside");
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
			const hoverIntensity = clamp(hoverIntensityById[point.id] ?? 0, 0, 1);
			const influencedRadius = clamp(
				pulseRadius + HOVER_RADIUS_INFLUENCE_BOOST * hoverIntensity,
				MIN_CELL_RADIUS,
				MAX_CELL_RADIUS,
			);

			return {
				...point,
				weight: Math.max(0.05, point.weight * (1 + wave * pulse.amplitude)),
				radius: influencedRadius,
			};
		});
	}, [animatedPoints, pulseClock, hoverIntensityById]);

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
			const bounds = getPolygonBounds(clippedPolygon);

			cells.push({
				point,
				path,
				polygon: clippedPolygon,
				clipPathId: `location-clip-${point.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
				bounds,
			});
		}

		return cells;
	}, [pulsedPoints]);

	const hasAtlasLocations = targetPoints.length > 0;
	const targetRadiusById = useMemo(
		() => Object.fromEntries(targetPoints.map((point) => [point.id, point.radius])),
		[targetPoints],
	);

	const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;

		let clickedCell: VoronoiCell | null = null;

		for (const cell of voronoiCells) {
			if (isPointInsidePolygon(x, y, cell.polygon)) {
				clickedCell = cell;
				break;
			}
		}

		if (!clickedCell) {
			let bestMatch: { cell: VoronoiCell; distanceSq: number } | null = null;
			for (const cell of voronoiCells) {
				const dx = x - cell.point.x;
				const dy = y - cell.point.y;
				const distanceSq = dx * dx + dy * dy;
				const targetRadius = cell.point.radius + HOVER_TARGET_RADIUS_PAD;
				if (distanceSq <= targetRadius * targetRadius) {
					if (!bestMatch || distanceSq < bestMatch.distanceSq) {
						bestMatch = { cell, distanceSq };
					}
				}
			}
			clickedCell = bestMatch?.cell ?? null;
		}

		if (clickedCell) {
			const isArdeia = clickedCell.point.id.startsWith("ardeia-");
			const locationName = targetPoints.find((p) => p.id === clickedCell!.point.id)?.name ?? clickedCell.point.id;
			setPendingLocation({
				name: locationName,
				isArdeia,
				locationId: clickedCell.point.id,
				outsideSelected: false,
			});
		} else {
			setPendingLocation({ name: "Outside", isArdeia: false, outsideSelected: true });
		}
	};

	const getMapPointerCoordinates = (event: PointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
		return { x, y };
	};

	const handleMapPointerMove = (event: PointerEvent<SVGSVGElement>) => {
		if (!voronoiCells.length) {
			setHoveredCellId((current) => (current !== OUTSIDE_ID ? OUTSIDE_ID : current));
			return;
		}

		const { x, y } = getMapPointerCoordinates(event);
		const eventTarget = event.target as Element | null;
		const targetCellId = eventTarget?.getAttribute("data-cell-id") ?? null;

		if (targetCellId) {
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

			const nextHoveredCellId = bestMatch?.id ?? OUTSIDE_ID;
			setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
			return;
		}

		const nextHoveredCellId = hoveredCell.point.id;
		setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
	};

	const handleMapPointerLeave = () => {
		setHoveredCellId((current) => (current ? null : current));
	};

	const handleCellPointerEnter = (cellId: string) => {
		setHoveredCellId((current) => (current === cellId ? current : cellId));
	};

	return (
		<BlurredBackground
			imageUrl={MAP_BACKGROUND_IMAGE}
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
					position: "relative",
				}}
			>
				<IconButton
					onClick={() => setScreenType(ScreenType.MENU)}
					onMouseEnter={() => setTooltip("Open menu", MenuRounded)}
					onMouseLeave={clearTooltip}
					aria-label="Open menu"
					sx={{
						position: "absolute",
						top: { xs: 20, md: 28 },
						right: { xs: 20, md: 28 },
						width: 58,
						height: 58,
						zIndex: 3,
						color: "rgba(244, 250, 255, 0.94)",
						background: "radial-gradient(circle at 30% 30%, rgba(151, 195, 221, 0.55), rgba(24, 45, 63, 0.82) 72%)",
						border: "1px solid rgba(208, 233, 247, 0.42)",
						backdropFilter: "blur(14px)",
						boxShadow: "0 14px 28px rgba(0, 0, 0, 0.34), 0 0 22px rgba(138, 176, 204, 0.22)",
						"&:hover": {
							background: "radial-gradient(circle at 30% 30%, rgba(171, 214, 238, 0.72), rgba(28, 54, 75, 0.9) 72%)",
						},
					}}
				>
					<MenuRounded sx={{ fontSize: 28 }} />
				</IconButton>

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
						background: `linear-gradient(180deg, rgba(4, 12, 22, 0.16), rgba(4, 12, 22, 0.34)), url(${MAP_BACKGROUND_IMAGE}) center / cover no-repeat`,
					}}
				>
					<svg
						width="100%"
						height="100%"
						viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
						preserveAspectRatio="none"
						onClick={handleMapClick}
						onPointerMove={handleMapPointerMove}
						onPointerLeave={handleMapPointerLeave}
						style={{ cursor: "crosshair", display: "block" }}
					>
						<image
							href={MAP_BACKGROUND_IMAGE}
							x={0}
							y={0}
							width={MAP_WIDTH}
							height={MAP_HEIGHT}
							preserveAspectRatio="xMidYMid slice"
							opacity={0.94}
						/>
						<rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="rgba(2,10,18,0.34)" />

						<defs>
								{voronoiCells.map((cell) => (
									<clipPath key={cell.clipPathId} id={cell.clipPathId} clipPathUnits="userSpaceOnUse">
										<path d={cell.path} />
									</clipPath>
								))}
						</defs>

						{voronoiCells.map((cell) => {
							return (
								<MapCell
									key={cell.point.id}
									cell={cell}
									targetRadius={targetRadiusById[cell.point.id] ?? cell.point.radius}
									onPointerEnter={handleCellPointerEnter}
									onPointerLeave={handleMapPointerLeave}
								/>
							);
						})}

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

				<ConfirmDialog
					isOpen={pendingLocation !== null}
					title={
						pendingLocation
							? pendingLocation.isArdeia
								? `Visit ${pendingLocation.name}?`
								: `Journey to ${pendingLocation.name}?`
							: ""
					}
					message=""
					confirmText={pendingLocation?.isArdeia ? "Visit" : "Journey"}
					cancelText="Stay"
					onConfirm={() => {
						if (!pendingLocation) {
							return;
						}

						const skit = stage().startTravelSkit({
							selectedLocationId: pendingLocation.locationId,
							outsideSelected: pendingLocation.outsideSelected,
						});

						setPendingLocation(null);
						if (skit) {
							setScreenType(ScreenType.SKIT);
						}
					}}
					onCancel={() => setPendingLocation(null)}
				/>
			</BlurredBackground>
		);
};
