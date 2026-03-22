import { FC, MouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { Location } from "../content/Location";
import { BlurredBackground, NovelVisualizer } from "@lord-raven/novel-visualizer";
import { Box, IconButton, Typography } from "@mui/material";
import { LastPage, MenuRounded, PlayArrow, Send } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { ConfirmDialog, NamePlate } from "./UiComponents";
import { useTooltip } from "./TooltipContext";
import { MapCell, MapCellData } from "./MapCell";
import * as d3WeightedVoronoiModule from "d3-weighted-voronoi";
import { determineEmotion, generateSkitScript, getCurrentLocation, Skit } from "../content/Skit";
import { Actor, getEmotionImage } from "../content/Actor";

export type MapScreenMode = 'management' | 'skit';

interface MapScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
	isVerticalLayout: boolean;
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
const MIN_RENDERABLE_CELL_AREA = 1;
const POINT_TRANSITION_MS = 700;
const HOVER_TRANSITION_MS = 240;
const PULSE_TICK_MS = 50;
const HOVER_TARGET_RADIUS_PAD = 26;
const HOVER_RADIUS_INFLUENCE_BOOST = 30;
const FULLSCREEN_TRANSITION_MS = 520;
const FULLSCREEN_DIMMED_OPACITY = 0.08;
const FULLSCREEN_TARGET_RADIUS = Math.hypot(MAP_WIDTH, MAP_HEIGHT);
const FULLSCREEN_BACKGROUND_BLUR_PX = 8;
const FULLSCREEN_CELL_BLUR_PX = 1;
const EXPEDITION_TOOLTIP_LIFESPAN_MS = 10000;
const UNAVAILABLE_EXPEDITION_DIM_OPACITY = 0.18;
const MAP_BACKGROUND_IMAGE = "https://avatars.charhub.io/avatars/uploads/images/gallery/file/5c990a43-3e56-455f-ba19-ba487eec4972/1a9f6a36-676f-4dc1-85ae-29bf7a97e538.png";


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
	const amplitude = 0.1 + (((hash >> 24) & 0xff) / 255) * 0.05;
	return { phase, frequency, amplitude };
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

const getLocationBorderStroke = (themeColor: string) => {
	const normalizedThemeColor = asHexColor(themeColor) || "#d7be7a";
	return colorWithAlpha(normalizedThemeColor, 0.86, "rgba(215, 190, 122, 0.86)");
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

const getPolygonArea = (polygon: number[][]) => {
	if (polygon.length < 3) {
		return 0;
	}

	let doubledArea = 0;
	for (let i = 0; i < polygon.length; i += 1) {
		const [x1, y1] = polygon[i];
		const [x2, y2] = polygon[(i + 1) % polygon.length];
		doubledArea += x1 * y2 - x2 * y1;
	}

	return Math.abs(doubledArea) * 0.5;
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

export const MapScreen: FC<MapScreenProps> = ({ stage, setScreenType, isVerticalLayout }) => {
	const [pulseClock, setPulseClock] = useState(() => performance.now());
	const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
	const { message: activeTooltipMessage, setTooltip, clearTooltip } = useTooltip();
	const animatedPointsRef = useRef<VoronoiPoint[]>([]);
	const hoverIntensityRef = useRef<Record<string, number>>({});
	const lastMapTooltipRef = useRef<string | null>(null);
	const activeTooltipMessageRef = useRef<string | null>(activeTooltipMessage);
	const [hoverIntensityById, setHoverIntensityById] = useState<Record<string, number>>({});
	const [pendingLocation, setPendingLocation] = useState<{
		name: string;
		isArdeia: boolean;
		locationId: string;
	} | null>(null);
	const [mapMode, setMapMode] = useState<MapScreenMode>(stage().getCurrentSkit() ? 'skit' : 'management');
	const [skitLocationId, setSkitLocationId] = useState<string | null>(null);
	const [skitCellBounds, setSkitCellBounds] = useState<{ top: number; right: number; bottom: number; left: number } | null>(null);
	const [isGeneratingNextSkit, setIsGeneratingNextSkit] = useState(false);
	const [fullScreenCellId, setFullScreenCellId] = useState<string | null>(null);
	const [fullScreenTransitionCellId, setFullScreenTransitionCellId] = useState<string | null>(null);
	const [fullScreenProgress, setFullScreenProgress] = useState(0);
	const [currentSkitIndex, setCurrentSkitIndex] = useState<number | null>(null);
	const mapClickTimeoutRef = useRef<number | null>(null);
	const initializedSkitIdRef = useRef<string | null>(null);
	const fullScreenProgressRef = useRef(0);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setScreenType(ScreenType.MENU);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [fullScreenCellId, fullScreenTransitionCellId, mapMode, setScreenType]);

	useEffect(() => {
		if (fullScreenCellId) {
			setFullScreenTransitionCellId(fullScreenCellId);
		}
	}, [fullScreenCellId]);

	useEffect(() => {
		const hasTransition = fullScreenCellId !== null || fullScreenTransitionCellId !== null;
		if (!hasTransition) {
			return;
		}

		const targetProgress = fullScreenCellId ? 1 : 0;
		const startProgress = fullScreenProgressRef.current;
		if (Math.abs(startProgress - targetProgress) < 0.001) {
			if (!fullScreenCellId && targetProgress === 0) {
				setFullScreenTransitionCellId(null);
			}
			return;
		}

		let frameId = 0;
		const transitionStart = performance.now();

		const animateTransition = (now: number) => {
			const progress = clamp((now - transitionStart) / FULLSCREEN_TRANSITION_MS, 0, 1);
			const easedProgress = 1 - Math.pow(1 - progress, 3);
			const nextProgress = lerp(startProgress, targetProgress, easedProgress);

			fullScreenProgressRef.current = nextProgress;
			setFullScreenProgress(nextProgress);

			if (progress < 1) {
				frameId = window.requestAnimationFrame(animateTransition);
				return;
			}

			if (!fullScreenCellId && targetProgress === 0) {
				setFullScreenTransitionCellId(null);
			}
		};

		frameId = window.requestAnimationFrame(animateTransition);
		return () => window.cancelAnimationFrame(frameId);
	}, [fullScreenCellId, fullScreenTransitionCellId]);

	useEffect(() => {
		if (mapMode !== 'skit') {
			setCurrentSkitIndex(null);
			setFullScreenCellId(null);
		}
	}, [mapMode]);

	useEffect(() => {
		const currentSkit = stage().getCurrentSkit();
		if (!currentSkit || mapMode !== 'skit') {
			setCurrentSkitIndex(null);
			setFullScreenCellId(null);
			return;
		}

		if (currentSkit.script.length === 0) {
			setCurrentSkitIndex(0);
			return;
		}

		setCurrentSkitIndex((value) => {
			if (value === null) {
				return 0;
			}
			return clamp(value, 0, currentSkit.script.length - 1);
		});
	}, [mapMode, stage]);

	useEffect(() => {
		const currentSkit = stage().getCurrentSkit();
		if (!currentSkit || mapMode !== 'skit' || currentSkitIndex === null) {
			setFullScreenCellId(null);
			return;
		}

		const locationId = getCurrentLocation(currentSkit, currentSkitIndex);
		const location = stage().getSave().atlas?.[locationId];
		if (!locationId || !location?.discovered) {
			setFullScreenCellId(null);
			return;
		}

		setFullScreenCellId(locationId);
	}, [currentSkitIndex, mapMode, stage]);

	useEffect(() => {
		return () => {
			if (mapClickTimeoutRef.current !== null) {
				window.clearTimeout(mapClickTimeoutRef.current);
			}
		};
	}, []);

	const discoveredLocationSignature = Object.values(stage().getSave().atlas as Record<string, Location>)
		.map((location) => [
			location.id,
			location.discovered ? '1' : '0',
			location.weight ?? 1,
			location.center?.x ?? '',
			location.center?.y ?? '',
			location.focalPoint?.x ?? '',
			location.focalPoint?.y ?? '',
			location.imageUrl ?? '',
			location.themeColor ?? '',
		].join(':'))
		.sort()
		.join('|');
	const expeditionChoiceSignature = (stage().getSave().expeditionChoices || [])
		.map((choice: { id: string; locationId: string; partnerActorId: string; description: string }) => [
			choice.id,
			choice.locationId,
			choice.partnerActorId,
			choice.description ?? '',
		].join(':'))
		.sort()
		.join('|');

	const expeditionChoiceByLocationId = useMemo(() => {
		const choices = (stage().getSave().expeditionChoices || []) as Array<{
			id: string;
			locationId: string;
			description: string;
			partnerActorId: string;
		}>;
		return new Map(choices.map((choice) => [choice.locationId, choice]));
	}, [expeditionChoiceSignature, stage]);

	const targetPoints = useMemo(() => {
		const save = stage().getSave();
		const atlasEntries = Object.values(save.atlas as Record<string, Location>).filter(
			(location) => location.discovered,
		);
		return atlasEntries.map((location) => {
			const weight = Math.max(0.05, location.weight || 1);
			const focalPoint = normalizeRelativePoint(location.focalPoint, normalizeRelativePoint(location.center));

			return {
				id: location.id,
				name: location.name || "Unnamed Location",
				x: normalizeCoordinate(location.center?.x ?? 0.5, MAP_WIDTH),
				y: normalizeCoordinate(location.center?.y ?? 0.5, MAP_HEIGHT),
				weight,
				radius: getRadiusFromWeight(weight),
				imageUrl: location.imageUrl || '',
				focalPoint,
				themeColor: location.themeColor,
			};
		});
	}, [discoveredLocationSignature, stage]);

	const [animatedPoints, setAnimatedPoints] = useState<VoronoiPoint[]>(targetPoints);

	const skit = stage().getCurrentSkit();

	const handleSkitSubmit = useCallback(async (input: string, skitArg: any, index: number) => {
		if ((input.trim() === '' && index < skitArg.script.length - 1) || index < 0 || index >= skitArg.script.length) {
			return skitArg;
		} else if (input.trim() === '' && skitArg.script.length > 0 && skitArg.script[index].endScene) {
			stage().endSkit();
			setMapMode('management');
			setSkitLocationId(null);
			setSkitCellBounds(null);
			return null;
		} else {
			const nextEntries = await generateSkitScript(skitArg as Skit, stage());
			(skitArg as Skit).script.push(...nextEntries);
			const currentTimelineEvent = stage().getSave().timeline?.find(e => e.skit?.id === skitArg.id);
			if (currentTimelineEvent) {
				currentTimelineEvent.skit = skitArg as Skit;
				stage().saveGame();
			}
			return skitArg;
		}
	}, [stage]);

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
		if (mapMode !== 'skit' || !skit || skit.script.length > 0) {
			return;
		}
		if (initializedSkitIdRef.current === skit.id) {
			return;
		}
		initializedSkitIdRef.current = skit.id;

		const initScript = async () => {
			console.log("Generating initial skit script...");
			setIsGeneratingNextSkit(true);
			try {
				const nextEntries = await generateSkitScript(skit, stage());
				if (nextEntries.length === 0) {
					return;
				}
				skit.script.push(...nextEntries);
				
				stage().saveGame();
			} finally {
				console.log("Finished generating initial skit script.");
				setIsGeneratingNextSkit(false);
			}
		};
		initScript();
	}, [mapMode, skit, stage]);

	useEffect(() => {
		activeTooltipMessageRef.current = activeTooltipMessage;
	}, [activeTooltipMessage]);

	useEffect(() => {
		return () => {
			if (
				lastMapTooltipRef.current &&
				activeTooltipMessageRef.current === lastMapTooltipRef.current
			) {
				clearTooltip();
			}
		};
	}, [clearTooltip]);

	useEffect(() => {
		if (!hoveredCellId) {
			if (
				lastMapTooltipRef.current &&
				activeTooltipMessageRef.current === lastMapTooltipRef.current
			) {
				clearTooltip();
			}
			lastMapTooltipRef.current = null;
			return;
		}

		const hoveredPoint = targetPoints.find((point) => point.id === hoveredCellId);
		if (!hoveredPoint) {
			setHoveredCellId(null);
			return;
		}

		const expeditionChoice = expeditionChoiceByLocationId.get(hoveredPoint.id);
		const tooltipMessage = expeditionChoice?.description?.trim() || hoveredPoint.name;
		const tooltipExpiryMs = expeditionChoice ? EXPEDITION_TOOLTIP_LIFESPAN_MS : undefined;

		setTooltip(tooltipMessage, undefined, tooltipExpiryMs);
		lastMapTooltipRef.current = tooltipMessage;
	}, [hoveredCellId, targetPoints, expeditionChoiceByLocationId, setTooltip, clearTooltip]);

	const pulsedPoints = useMemo(() => {
		const timeSeconds = pulseClock / 1000;
		return animatedPoints.map((point) => {
			const isFullScreenPoint = fullScreenTransitionCellId === point.id;
			const pulse = getPulseProfile(point.id);
			const wave = isFullScreenPoint
				? 0
				: Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase);
			const secondaryWave = isFullScreenPoint
				? 0
				: Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase + 1.1);
			const pulseRadius = isFullScreenPoint
				? point.radius
				: clamp(
					point.radius * (1 + secondaryWave * pulse.amplitude * 0.35),
					MIN_CELL_RADIUS,
					MAX_CELL_RADIUS,
				);
			const hoverIntensity = isFullScreenPoint
				? 0
				: clamp(hoverIntensityById[point.id] ?? 0, 0, 1);
			const influencedRadius = clamp(
				pulseRadius + HOVER_RADIUS_INFLUENCE_BOOST * hoverIntensity,
				MIN_CELL_RADIUS,
				MAX_CELL_RADIUS,
			);
			const targetRadius = isFullScreenPoint ? FULLSCREEN_TARGET_RADIUS : influencedRadius;
			const nextRadius = lerp(influencedRadius, targetRadius, fullScreenProgress);
			const nextX = isFullScreenPoint ? lerp(point.x, MAP_WIDTH / 2, fullScreenProgress) : point.x;
			const nextY = isFullScreenPoint ? lerp(point.y, MAP_HEIGHT / 2, fullScreenProgress) : point.y;

			return {
				...point,
				x: nextX,
				y: nextY,
				weight: Math.max(0.05, point.weight * (1 + wave * pulse.amplitude)),
				radius: nextRadius,
			};
		});
	}, [animatedPoints, fullScreenProgress, fullScreenTransitionCellId, hoverIntensityById, pulseClock]);

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
			const clippedPolygon = clipPolygonWithConvex(polygon, radiusPolygon);
			if (clippedPolygon.length < 3 || getPolygonArea(clippedPolygon) <= MIN_RENDERABLE_CELL_AREA) {
				continue;
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
	const hasFullScreenCell = !!(fullScreenCellId || fullScreenTransitionCellId);
	const backgroundBlur = lerp(0, 1, fullScreenProgress);
	const targetRadiusById = useMemo(
		() => Object.fromEntries(targetPoints.map((point) => {
			const isFullScreenPoint = fullScreenTransitionCellId === point.id;
			const radius = isFullScreenPoint
				? lerp(point.radius, FULLSCREEN_TARGET_RADIUS, fullScreenProgress)
				: point.radius;
			return [point.id, radius];
		})),
		[fullScreenProgress, fullScreenTransitionCellId, targetPoints],
	);

	const getCellAtCoordinates = useCallback((x: number, y: number) => {
		let hitCell: VoronoiCell | null = null;

		for (const cell of voronoiCells) {
			if (isPointInsidePolygon(x, y, cell.polygon)) {
				hitCell = cell;
				break;
			}
		}

		if (hitCell) {
			return hitCell;
		}

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

		return bestMatch?.cell ?? null;
	}, [voronoiCells]);

	const expeditionPortraitMarkers = useMemo(() => {
		if (mapMode !== 'management') {
			return [] as Array<{
				key: string;
				imageUrl: string;
				cx: number;
				cy: number;
				radius: number;
				stroke: string;
				strokeWidth: number;
				clipPathId: string;
			}>;
		}

		const save = stage().getSave();
		const choices = (save.expeditionChoices || []) as Array<{
			locationId: string;
			partnerActorId: string;
		}>;

		return choices.flatMap((choice) => {
			const cell = voronoiCells.find((candidate) => candidate.point.id === choice.locationId);
			if (!cell) {
				return [];
			}

			const partnerActor = save.actors?.[choice.partnerActorId];
			if (!partnerActor) {
				return [];
			}

			const imageUrl =
				getEmotionImage(partnerActor, 'neutral', stage(), partnerActor.appearanceId) ||
				partnerActor.avatarImageUrl ||
				'';
			if (!imageUrl) {
				return [];
			}

			const targetRadius = targetRadiusById[cell.point.id] ?? cell.point.radius;
			const emphasis = clamp((cell.point.radius - targetRadius) / 30, 0, 1);
			const strokeWidth = 1.8 + emphasis * 0.4;
			const stroke = getLocationBorderStroke(cell.point.themeColor);
			const radius = clamp(Math.min(cell.bounds.width, cell.bounds.height) * 0.13, 14, 28);
			const alignsToLeftEdge = cell.point.x >= MAP_WIDTH / 2;
			const preferredX = alignsToLeftEdge
				? cell.bounds.x + radius + strokeWidth + 2
				: cell.bounds.x + cell.bounds.width - radius - strokeWidth - 2;
			const cx = clamp(preferredX, radius + 1, MAP_WIDTH - radius - 1);
			const cy = clamp(cell.bounds.y + radius + 5, radius + 1, MAP_HEIGHT - radius - 1);

			return [{
				key: `${choice.locationId}-${choice.partnerActorId}`,
				imageUrl,
				cx,
				cy,
				radius,
				stroke,
				strokeWidth,
				clipPathId: `expedition-choice-portrait-${choice.locationId.replace(/[^a-zA-Z0-9_-]/g, "")}-${choice.partnerActorId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
			}];
		});
	}, [expeditionChoiceSignature, mapMode, stage, targetRadiusById, voronoiCells]);

	const selectMapLocation = useCallback((x: number, y: number) => {
		const clickedCell = getCellAtCoordinates(x, y);

		if (clickedCell) {
			const isArdeia = clickedCell.point.id.startsWith("ardeia-");
			const locationName = targetPoints.find((p) => p.id === clickedCell!.point.id)?.name ?? clickedCell.point.id;
			setPendingLocation({
				name: locationName,
				isArdeia,
				locationId: clickedCell.point.id,
			});
		}
	}, [getCellAtCoordinates, targetPoints]);

	const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
		if (hasFullScreenCell) {
			setFullScreenCellId(null);
			return;
		}

		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;

		if (mapClickTimeoutRef.current !== null) {
			window.clearTimeout(mapClickTimeoutRef.current);
		}

		mapClickTimeoutRef.current = window.setTimeout(() => {
			selectMapLocation(x, y);
			mapClickTimeoutRef.current = null;
		}, 220);
	};

	const handleMapDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
		if (mapClickTimeoutRef.current !== null) {
			window.clearTimeout(mapClickTimeoutRef.current);
			mapClickTimeoutRef.current = null;
		}
		event.preventDefault();
	};

	const getMapPointerCoordinates = (event: PointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
		return { x, y };
	};

	const handleMapPointerMove = (event: PointerEvent<SVGSVGElement>) => {
		if (hasFullScreenCell && fullScreenTransitionCellId) {
			setHoveredCellId((current) => (current === fullScreenTransitionCellId ? current : fullScreenTransitionCellId));
			return;
		}

		if (!voronoiCells.length) {
			setHoveredCellId((current) => (current ? null : current));
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

			const nextHoveredCellId = bestMatch?.id ?? null;
			setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
			return;
		}

		const nextHoveredCellId = hoveredCell.point.id;
		setHoveredCellId((current) => (current === nextHoveredCellId ? current : nextHoveredCellId));
	};

	const handleMapPointerLeave = () => {
		if (hasFullScreenCell && fullScreenTransitionCellId) {
			setHoveredCellId((current) => (current === fullScreenTransitionCellId ? current : fullScreenTransitionCellId));
			return;
		}

		setHoveredCellId((current) => (current ? null : current));
	};

	const handleCellPointerEnter = (cellId: string) => {
		if (hasFullScreenCell && fullScreenTransitionCellId && fullScreenTransitionCellId !== cellId) {
			return;
		}

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
						top: 16,
						right: 16,
						zIndex: 11,
						color: "rgba(244, 250, 255, 0.94)",
						backgroundColor: "rgba(22, 28, 44, 0.76)",
						backdropFilter: "blur(6px)",
						padding: "8px 16px",
						borderRadius: "20px",
						border: "1px solid rgba(138, 176, 204, 0.48)",
						boxShadow: "0 4px 18px rgba(10, 16, 29, 0.55), 0 0 16px rgba(138, 176, 204, 0.2)",
						"&:hover": {
							backgroundColor: "rgba(32, 42, 64, 0.86)",
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
						position: "relative",
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
						onDoubleClick={handleMapDoubleClick}
						onPointerMove={handleMapPointerMove}
						onPointerLeave={handleMapPointerLeave}
						style={{ cursor: "crosshair", display: "block" }}
					>
							<g style={{ filter: `blur(${backgroundBlur * FULLSCREEN_BACKGROUND_BLUR_PX}px)` }}>
								<image
									href={MAP_BACKGROUND_IMAGE}
									x={0}
									y={0}
									width={MAP_WIDTH}
									height={MAP_HEIGHT}
									preserveAspectRatio={hasFullScreenCell ? "xMidYMid meet" : "xMidYMid slice"}
									opacity={0.94}
								/>
								<rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="rgba(2,10,18,0.34)" />
							</g>

						<defs>
								{voronoiCells.map((cell) => (
									<clipPath key={cell.clipPathId} id={cell.clipPathId} clipPathUnits="userSpaceOnUse">
										<path d={cell.path} />
									</clipPath>
								))}
								{expeditionPortraitMarkers.map((portrait) => (
									<clipPath key={portrait.clipPathId} id={portrait.clipPathId} clipPathUnits="userSpaceOnUse">
										<circle cx={portrait.cx} cy={portrait.cy} r={portrait.radius} />
									</clipPath>
								))}
						</defs>

						{voronoiCells.map((cell) => {
							const isFullScreenPoint = fullScreenTransitionCellId === cell.point.id;
							const isOutsideArdeia = !cell.point.id.startsWith("ardeia-");
							const isExpeditionOption = expeditionChoiceByLocationId.has(cell.point.id);
							const backgroundDimOpacity = mapMode === 'management' && isOutsideArdeia && !isExpeditionOption
								? UNAVAILABLE_EXPEDITION_DIM_OPACITY
								: 0;
							const cellOpacity = hasFullScreenCell
								? (isFullScreenPoint ? 1 : lerp(1, FULLSCREEN_DIMMED_OPACITY, fullScreenProgress))
								: 1;
							return (
								<MapCell
									key={cell.point.id}
									cell={cell}
									targetRadius={targetRadiusById[cell.point.id] ?? cell.point.radius}
									backgroundBlurPx={0.5 + (isFullScreenPoint ? backgroundBlur * FULLSCREEN_CELL_BLUR_PX : 0)}
									backgroundDimOpacity={backgroundDimOpacity}
									onPointerEnter={handleCellPointerEnter}
									onPointerLeave={handleMapPointerLeave}
									opacity={cellOpacity}
									isInteractive={!hasFullScreenCell || isFullScreenPoint}
									lockBackgroundToTargetRadius={!isFullScreenPoint}
								/>
							);
						})}

						{mapMode === 'management' && expeditionPortraitMarkers.map((portrait) => (
							<g key={portrait.key} style={{ pointerEvents: 'none' }}>
								<circle
									cx={portrait.cx}
									cy={portrait.cy}
									r={portrait.radius}
									fill="rgba(8, 12, 18, 0.95)"
								/>
								<image
									href={portrait.imageUrl}
									x={portrait.cx - portrait.radius}
									y={portrait.cy - portrait.radius}
									width={portrait.radius * 2}
									height={portrait.radius * 2}
									preserveAspectRatio="xMidYMin slice"
									clipPath={`url(#${portrait.clipPathId})`}
								/>
								<circle
									cx={portrait.cx}
									cy={portrait.cy}
									r={portrait.radius}
									fill="none"
									stroke={portrait.stroke}
									strokeWidth={portrait.strokeWidth}
								/>
							</g>
						))}

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
				<AnimatePresence>
					{mapMode === 'skit' && skit && (
						<motion.div
							key="skit-overlay"
							initial={{
								clipPath: skitCellBounds
									? `inset(${skitCellBounds.top.toFixed(1)}% ${skitCellBounds.right.toFixed(1)}% ${skitCellBounds.bottom.toFixed(1)}% ${skitCellBounds.left.toFixed(1)}% round 24px)`
									: 'inset(40% 40% 40% 40% round 24px)',
							}}
							animate={{ clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
							exit={{
								clipPath: skitCellBounds
									? `inset(${skitCellBounds.top.toFixed(1)}% ${skitCellBounds.right.toFixed(1)}% ${skitCellBounds.bottom.toFixed(1)}% ${skitCellBounds.left.toFixed(1)}% round 24px)`
									: 'inset(40% 40% 40% 40% round 24px)',
							}}
							transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
							style={{ position: 'absolute', inset: 0, zIndex: 10 }}
						>
							<Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
								<Box
									sx={{
										position: 'absolute',
										top: 16,
										left: 16,
										zIndex: 1000,
										backgroundColor: 'rgba(22, 28, 44, 0.76)',
										backdropFilter: 'blur(6px)',
										padding: '8px 24px',
										borderRadius: '20px',
										border: '1px solid rgba(138, 176, 204, 0.48)',
										boxShadow: '0 4px 18px rgba(10, 16, 29, 0.55), 0 0 16px rgba(138, 176, 204, 0.2)',
									}}
								>
									<Typography
										variant="h6"
										sx={{
											color: '#edf2f2',
											fontWeight: 'bold',
											fontSize: '1.1rem',
											letterSpacing: '0.08em',
											textTransform: 'uppercase',
											textShadow: '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 10px rgba(138, 176, 204, 0.24)',
										}}
									>
										{skit.initialLocationId
											? (stage().getSave().atlas[skit.initialLocationId]?.name || skit.initialLocationId)
											: 'Memoria'}
									</Typography>
								</Box>
								{skit.script && (
									<NovelVisualizer
										script={skit}
										loading={isGeneratingNextSkit}
										renderNameplate={(actor: any) => {
											if (!actor || !actor.name) return null;
											return <NamePlate actor={actor as Actor} />;
										}}
										setTooltip={setTooltip}
										isVerticalLayout={isVerticalLayout}
										actors={stage().getSave().actors}
										playerActorId={stage().getPlayerActor().id}
										getPresentActors={(_script, _index) =>
											skit.initialActors?.map((id) => stage().getSave().actors[id]).filter(Boolean) || []
										}
										getActorImageUrl={(actor, _script, index) => {
											const emotion = determineEmotion(actor.id, skit, index);
											return (
												getEmotionImage(actor as Actor, emotion, stage(), (actor as Actor).appearanceId) ||
												getEmotionImage(actor as Actor, 'neutral', stage(), (actor as Actor).appearanceId) ||
												''
											);
										}}
										getActorImageColorMultiplier={(actor: Actor, script: Skit, index: number) => {
											// Actually based on location highlight and not on actor at all.
											return stage().getSave().atlas?.[getCurrentLocation(skit, index) || '']?.lightColor || '#eeeeee';
										}}
										onSubmitInput={handleSkitSubmit}
										getSubmitButtonConfig={(_script, index, inputText) => {
											const endScene = index >= 0 ? (skit.script[index]?.endScene || false) : false;
											return {
												label: inputText.trim().length > 0 ? 'Send' : (endScene ? 'End' : 'Continue'),
												enabled: true,
												colorScheme: inputText.trim().length > 0 ? 'primary' : (endScene ? 'error' : 'primary'),
												icon: inputText.trim().length > 0 ? <Send /> : (endScene ? <LastPage /> : <PlayArrow />),
											};
										}}
										enableAudio={!stage().getSave().textToSpeech}
										enableGhostSpeakers={true}
										enableTalkingAnimation={true}
										renderActorHoverInfo={(actor) => {
											if (!actor || actor.id === stage().getPlayerActor().id) return null;
											const typedActor = actor as Actor;
											const authorName = typedActor.fullPath?.split('/').filter(Boolean)[0] || '';
											return (
												<Box
													sx={{
														padding: 2,
														backgroundColor: 'rgba(21, 27, 41, 0.9)',
														borderRadius: 2,
														border: `1px solid ${typedActor.themeColor || '#8ab0cc'}`,
														maxWidth: 300,
														boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55)',
													}}
												>
													<Box sx={{ marginBottom: 1 }}>
														<NamePlate actor={typedActor} />
													</Box>
													{authorName && (
														<Typography
															variant="caption"
															sx={{
																display: 'block',
																marginBottom: 1,
																color: 'rgba(185, 210, 227, 0.84)',
																fontStyle: 'italic',
																fontFamily: '"Lora", Georgia, serif',
															}}
														>
															by {authorName}
														</Typography>
													)}
													<Box sx={{ color: '#edf2f2', fontSize: '0.9rem', lineHeight: 1.4 }}>
														{typedActor.profile}
													</Box>
												</Box>
											);
										}}
									/>
								)}
							</Box>
						</motion.div>
					)}
				</AnimatePresence>
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
					cancelText="Cancel"
					onConfirm={() => {
						if (!pendingLocation) {
							return;
						}

						const newSkit = stage().startTravelSkit(pendingLocation.locationId);

						if (newSkit) {
							setFullScreenCellId(null);
							const enteringCell = voronoiCells.find(c => c.point.id === pendingLocation.locationId);
							if (enteringCell) {
								const b = enteringCell.bounds;
								setSkitCellBounds({
									top: (b.y / MAP_HEIGHT) * 100,
									right: ((MAP_WIDTH - b.x - b.width) / MAP_WIDTH) * 100,
									bottom: ((MAP_HEIGHT - b.y - b.height) / MAP_HEIGHT) * 100,
									left: (b.x / MAP_WIDTH) * 100,
								});
							} else {
								setSkitCellBounds(null);
							}
							setSkitLocationId(pendingLocation.locationId);
							setMapMode('skit');
						}
						setPendingLocation(null);
					}}
					onCancel={() => setPendingLocation(null)}
				/>
			</BlurredBackground>
		);
};
