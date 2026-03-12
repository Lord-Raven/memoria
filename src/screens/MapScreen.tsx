import { FC, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { Location } from "../content/Location";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Box, Typography } from "@mui/material";
import { ArrowBack, DeleteSweep } from "@mui/icons-material";
import { motion } from "framer-motion";
import { Button } from "./UiComponents";
import { useTooltip } from "./TooltipContext";

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
	maxRadius: number;
	imageUrl: string;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;
const MIN_CELL_RADIUS = 40;
const MAX_CELL_RADIUS = 300;
const POINT_TRANSITION_MS = 700;
const PULSE_TICK_MS = 50;
const SDF_TILE_SIZE = 10;
const SDF_SMOOTHING_PASSES = 2;

const testImagePool = [
	"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
	"https://media.charhub.io/d41042d5-5860-4f76-85ac-885e65e92c2b/95fdc548-1c75-4101-a62e-65fc90a97437.png",
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
	const frequency = 0.14 + (((hash >> 16) & 0xff) / 255) * 0.22;
	const amplitude = 0.018 + (((hash >> 24) & 0xff) / 255) * 0.045;
	return { phase, frequency, amplitude };
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

const toPolygonPath = (polygon: number[][]) => {
	if (!polygon || polygon.length < 3) {
		return "";
	}
	return polygon
		.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
		.join(" ") + " Z";
};

const polygonArea = (polygon: number[][]) => {
	let area = 0;
	for (let i = 0; i < polygon.length; i += 1) {
		const [x1, y1] = polygon[i];
		const [x2, y2] = polygon[(i + 1) % polygon.length];
		area += x1 * y2 - x2 * y1;
	}
	return area * 0.5;
};

const dedupeSequentialPoints = (polygon: number[][], epsilon = 0.01) => {
	if (polygon.length < 2) {
		return polygon;
	}

	const deduped: number[][] = [polygon[0]];
	for (let i = 1; i < polygon.length; i += 1) {
		const previous = deduped[deduped.length - 1];
		const current = polygon[i];
		if (Math.hypot(current[0] - previous[0], current[1] - previous[1]) >= epsilon) {
			deduped.push(current);
		}
	}

	if (deduped.length > 2) {
		const first = deduped[0];
		const last = deduped[deduped.length - 1];
		if (Math.hypot(first[0] - last[0], first[1] - last[1]) < epsilon) {
			deduped.pop();
		}
	}

	return deduped;
};

const smoothClosedPolygon = (polygon: number[][], iterations: number) => {
	let current = polygon;
	for (let pass = 0; pass < iterations; pass += 1) {
		if (current.length < 3) {
			break;
		}

		const smoothed: number[][] = [];
		for (let i = 0; i < current.length; i += 1) {
			const p0 = current[i];
			const p1 = current[(i + 1) % current.length];
			smoothed.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
			smoothed.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
		}
		current = dedupeSequentialPoints(smoothed);
	}

	return current;
};

const buildSdfOwners = (points: VoronoiPoint[]) => {
	const columns = Math.max(1, Math.ceil(MAP_WIDTH / SDF_TILE_SIZE));
	const rows = Math.max(1, Math.ceil(MAP_HEIGHT / SDF_TILE_SIZE));
	const owners = new Int16Array(columns * rows);

	for (let row = 0; row < rows; row += 1) {
		const y = Math.min(MAP_HEIGHT, (row + 0.5) * SDF_TILE_SIZE);
		for (let column = 0; column < columns; column += 1) {
			const x = Math.min(MAP_WIDTH, (column + 0.5) * SDF_TILE_SIZE);
			let bestIndex = 0;
			let bestBoundaryDistance = Number.POSITIVE_INFINITY;
			let bestCenterDistanceSq = Number.POSITIVE_INFINITY;

			for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
				const point = points[pointIndex];
				const dx = x - point.x;
				const dy = y - point.y;
				const centerDistanceSq = dx * dx + dy * dy;
				const boundaryDistance = Math.sqrt(centerDistanceSq) - point.maxRadius;

				if (
					boundaryDistance < bestBoundaryDistance - 1e-6 ||
					(Math.abs(boundaryDistance - bestBoundaryDistance) <= 1e-6 && centerDistanceSq < bestCenterDistanceSq)
				) {
					bestBoundaryDistance = boundaryDistance;
					bestCenterDistanceSq = centerDistanceSq;
					bestIndex = pointIndex;
				}
			}

			owners[row * columns + column] = bestIndex;
		}
	}

	return { owners, columns, rows };
};

type Edge = {
	start: number[];
	end: number[];
};

const keyForPoint = (point: number[]) => `${point[0].toFixed(3)},${point[1].toFixed(3)}`;

const traceLargestCellContour = (owners: Int16Array, columns: number, rows: number, cellIndex: number) => {
	const edges: Edge[] = [];

	const ownerAt = (column: number, row: number) => {
		if (column < 0 || row < 0 || column >= columns || row >= rows) {
			return -1;
		}
		return owners[row * columns + column];
	};

	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			if (ownerAt(column, row) !== cellIndex) {
				continue;
			}

			const x0 = column * SDF_TILE_SIZE;
			const y0 = row * SDF_TILE_SIZE;
			const x1 = Math.min(MAP_WIDTH, (column + 1) * SDF_TILE_SIZE);
			const y1 = Math.min(MAP_HEIGHT, (row + 1) * SDF_TILE_SIZE);

			if (ownerAt(column, row - 1) !== cellIndex) {
				edges.push({ start: [x1, y0], end: [x0, y0] });
			}
			if (ownerAt(column + 1, row) !== cellIndex) {
				edges.push({ start: [x1, y1], end: [x1, y0] });
			}
			if (ownerAt(column, row + 1) !== cellIndex) {
				edges.push({ start: [x0, y1], end: [x1, y1] });
			}
			if (ownerAt(column - 1, row) !== cellIndex) {
				edges.push({ start: [x0, y0], end: [x0, y1] });
			}
		}
	}

	if (edges.length === 0) {
		return [] as number[][];
	}

	const nextEdges = new Map<string, Array<{ key: string; edgeIndex: number }>>();
	for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
		const edge = edges[edgeIndex];
		const startKey = keyForPoint(edge.start);
		const endKey = keyForPoint(edge.end);
		const existing = nextEdges.get(startKey) || [];
		existing.push({ key: endKey, edgeIndex });
		nextEdges.set(startKey, existing);
	}

	const usedEdges = new Set<number>();
	const loops: number[][][] = [];

	for (let seed = 0; seed < edges.length; seed += 1) {
		if (usedEdges.has(seed)) {
			continue;
		}

		const seedEdge = edges[seed];
		const startKey = keyForPoint(seedEdge.start);
		let currentKey = startKey;
		const loop: number[][] = [seedEdge.start];

		while (true) {
			const candidates = nextEdges.get(currentKey) || [];
			const candidate = candidates.find((item) => !usedEdges.has(item.edgeIndex));
			if (!candidate) {
				break;
			}

			usedEdges.add(candidate.edgeIndex);
			const edge = edges[candidate.edgeIndex];
			loop.push(edge.end);
			currentKey = keyForPoint(edge.end);

			if (currentKey === startKey) {
				break;
			}
		}

		const dedupedLoop = dedupeSequentialPoints(loop);
		if (dedupedLoop.length >= 3) {
			loops.push(dedupedLoop);
		}
	}

	if (loops.length === 0) {
		return [] as number[][];
	}

	let largestLoop = loops[0];
	let largestArea = Math.abs(polygonArea(largestLoop));
	for (let i = 1; i < loops.length; i += 1) {
		const loopArea = Math.abs(polygonArea(loops[i]));
		if (loopArea > largestArea) {
			largestArea = loopArea;
			largestLoop = loops[i];
		}
	}

	return smoothClosedPolygon(largestLoop, SDF_SMOOTHING_PASSES);
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
			const requestedMaxRadius = Number(location.maxRadius);
			const fallbackRadius = 72 + Math.max(0, location.weight || 1) * 20;
			const maxRadius = Number.isFinite(requestedMaxRadius) && requestedMaxRadius > 0 ? requestedMaxRadius : fallbackRadius;

			return {
				id: location.id,
				name: location.name || "Unnamed Location",
				x: normalizeCoordinate(location.center?.x ?? 0.5, MAP_WIDTH),
				y: normalizeCoordinate(location.center?.y ?? 0.5, MAP_HEIGHT),
				weight: Math.max(0.05, location.weight || 1),
				maxRadius: clamp(maxRadius, MIN_CELL_RADIUS, MAX_CELL_RADIUS),
				imageUrl: location.imageUrl,
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
				maxRadius: clamp(targetPoint.maxRadius * 0.45, MIN_CELL_RADIUS, MAX_CELL_RADIUS),
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
					maxRadius: clamp(
						lerp(startPoint.maxRadius, targetPoint.maxRadius, easedProgress),
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

	const pulsedPoints = useMemo(() => {
		const timeSeconds = pulseClock / 1000;
		return animatedPoints.map((point) => {
			const pulse = getPulseProfile(point.id);
			const wave = Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase);
			const secondaryWave = Math.sin(timeSeconds * pulse.frequency * Math.PI * 2 + pulse.phase + 1.1);

			return {
				...point,
				weight: Math.max(0.05, point.weight * (1 + wave * pulse.amplitude)),
				maxRadius: clamp(
					point.maxRadius * (1 + secondaryWave * pulse.amplitude * 0.6),
					MIN_CELL_RADIUS,
					MAX_CELL_RADIUS,
				),
			};
		});
	}, [animatedPoints, pulseClock]);

	const voronoiCells = useMemo(() => {
		if (pulsedPoints.length === 0) {
			return [] as Array<{ point: VoronoiPoint; path: string; patternId: string }>;
		}

		const { owners, columns, rows } = buildSdfOwners(pulsedPoints);

		const cells: Array<{ point: VoronoiPoint; path: string; patternId: string }> = [];
		for (let index = 0; index < pulsedPoints.length; index += 1) {
			const point = pulsedPoints[index];
			const contour = traceLargestCellContour(owners, columns, rows, index);
			const path = toPolygonPath(contour);
			if (!path) {
				continue;
			}

			cells.push({
				point,
				path,
				patternId: `location-pattern-${point.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
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
		const randomMaxRadius = Math.round(64 + randomWeight * 22 + Math.random() * 36);
		const randomImageUrl = testImagePool[Math.floor(Math.random() * testImagePool.length)];

		const newLocation = new Location({
			name: `Test Location ${locationCount + 1}`,
			description: "Generated from MapScreen click for Voronoi testing.",
			weight: randomWeight,
			maxRadius: randomMaxRadius,
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
			`Added ${newLocation.name} (weight ${randomWeight}, radius ${randomMaxRadius}).`,
			undefined,
			2200,
		);
	};

	const clearLocations = () => {
		const save = getSaveForMutation(stage());
		const atlas = save.atlas as Record<string, Location>;
		const locationCount = Object.keys(atlas).length;

		if (locationCount === 0) {
			stage().showPriorityMessage("Atlas is already empty.", undefined, 1800);
			return;
		}

		for (const id of Object.keys(atlas)) {
			delete atlas[id];
		}

		stage().saveGame();
		setRevision((value) => value + 1);
		stage().showPriorityMessage(
			locationCount === 1 ? "Cleared 1 location from the atlas." : `Cleared ${locationCount} locations from the atlas.`,
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
							onMouseEnter={() => setTooltip("Delete all atlas locations", DeleteSweep)}
							onMouseLeave={clearTooltip}
							style={{
								minWidth: "160px",
								fontSize: "14px",
								background: "linear-gradient(180deg, rgba(122, 33, 33, 0.92), rgba(88, 19, 19, 0.95))",
								borderColor: "rgba(255, 120, 120, 0.35)",
							}}
						>
							Clear Locations
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
						</defs>

						{voronoiCells.map((cell) => (
							<g key={cell.point.id}>
								<path
									d={cell.path}
									fill={`url(#${cell.patternId})`}
									stroke="rgba(255,255,255,0.6)"
									strokeWidth={1.25}
									style={{ transition: "opacity 180ms ease" }}
								/>
								<path
									d={cell.path}
									fill="rgba(10, 26, 39, 0.32)"
									stroke="rgba(10, 18, 28, 0.7)"
									strokeWidth={0.8}
								/>
								<circle cx={cell.point.x} cy={cell.point.y} r={4.2} fill="rgba(255,255,255,0.88)" />
								<text
									x={cell.point.x + 8}
									y={cell.point.y - 8}
									fill="rgba(255,255,255,0.95)"
									style={{ fontSize: "15px", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
								>
									{cell.point.name}
								</text>
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
			</Box>
		</BlurredBackground>
	);
};
