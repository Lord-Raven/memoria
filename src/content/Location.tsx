import { v4 as generateUuid } from 'uuid';

const LOCATION_IMAGE_URLS = import.meta.glob('../assets/locations/**/*.{png,jpg,jpeg,webp,avif}', {
	eager: true,
	import: 'default',
}) as Record<string, string>;

const getLocationImage = (relativePath: string): string => {
	const imageUrl = LOCATION_IMAGE_URLS[`../assets/locations/${relativePath}`];
	if (!imageUrl) {
		throw new Error(`Missing location image: ${relativePath}`);
	}
	return imageUrl;
};

// Customize this list to define which locations are restored when the map is cleared.
// Default list are locations in the city of Ardeia, which is the central location of the game. Other areas will be more dynamic.
// Ardeia is a fantasy sci-fi city with a mixture of heavy gothic architecture mixed with overgrown greenery and archaically high-tech machinery that feels ancient and alien at once.
const DEFAULT_ATLAS_LOCATIONS: Location[] = [
	{
		id: "ardeia-streets",
		name: "The Streets of Ardeia",
		description: "",
		weight: 3,
		imageUrl: getLocationImage('ardeia/streets.png'),
		center: { x: 0.2, y: 0.3 },
		focalPoint: { x: 0.3, y: 0.2 },
		lightColor: "#d8d1ba",
		themeColor: "#5aa3d8",
		discovered: true,
	},
	{
		id: "ardeia-library",
		name: "The Library",
		description: "",
		weight: 2,
		imageUrl: getLocationImage('ardeia/library.png'),
		center: { x: 0.15, y: 0.275 },
		focalPoint: { x: 0.2, y: 0.4 },
		lightColor: "#e8a860",
		themeColor: "#d8a45a",
		discovered: true,

	},
	{
		id: "ardeia-temple",
		name: "The Temple",
		description: "",
		weight: 2,
		imageUrl: getLocationImage('ardeia/temple.png'),
		center: { x: 0.175, y: 0.35 },
		focalPoint: { x: 0.4, y: 0.5 },
		lightColor: "#f4cc73",
		themeColor: "#d86f5a",
		discovered: true,
	},
	{
		id: "ardeia-gardens",
		name: "The Gardens",
		description: "",
		weight: 2,
		imageUrl: getLocationImage('ardeia/gardens.png'),
		center: { x: 0.25, y: 0.325 },
		focalPoint: { x: 0.6, y: 0.4 },
		lightColor: "#b8e6cf",
		themeColor: '#39d78e',
		discovered: true,
	},
	{
		id: "ardeia-plaza",
		name: "The Plaza",
		description: "",
		weight: 2,
		imageUrl: getLocationImage('ardeia/plaza.png'),
		center: { x: 0.225, y: 0.25 },
		focalPoint: { x: 0.2, y: 0.4 },
		lightColor: "#eeeeee",
		themeColor: '#d8c659',
		discovered: true,
	},
    {
        id: "slumbering-orchard",
        name: "Slumbering Orchard",
        description: "",
        weight: 3,
		imageUrl: getLocationImage('outside/slumbering_orchard.png'),
        center: { x: 0.2, y: 0.6 }, // southwest
        focalPoint: { x: 0.7, y: 0.8 },
		lightColor: "#74919f",
        themeColor: "#7ecfbe",
        discovered: true,
    },
    {
        id: "bleached-earth",
        name: "Bleached Earth",
        description: "",
        weight: 5,
		imageUrl: getLocationImage('outside/bleached_earth.png'),
        center: { x: 0.7, y: 0.8 }, // southeast
        focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#eeeeee",
        themeColor: "#e8e4d1",
        discovered: true,
    },
    {
        id: 'the-loom',
        name: 'The Loom',
        description: '',
        weight: 2,
		imageUrl: getLocationImage('outside/loom.png'),
        center: { x: 0.5, y: 0.2 }, // northeast
        focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#d7c091",
        themeColor: '#d17ed8',
        discovered: true,
    }
];

export const createDefaultAtlas = () => {
	const atlas: Record<string, Location> = {};
	for (const seed of DEFAULT_ATLAS_LOCATIONS) {
		const location = new Location(seed);
		atlas[location.id] = location;
	}
	return atlas;
};

export class Location {
    id: string = '';
    name: string = '';
    description: string = '';
	weight: number = 1; // Base cell radius in map-vmin units (1 = 1% of min map dimension, 2 = double radius).
    imageUrl: string = ''; // URL for an image representing this location, used as background in skits or location displays.
    center: { x: number, y: number } = { x: 0, y: 0 }; // Relative center point for positioning this location on the map
    focalPoint?: { x: number, y: number } = { x: 0.5, y: 0.5 }; // Relative image focus used when cropping this location into map cells.
	lightColor: string = ''; // This is the lighting color for the location, used to tint character images in skits. If not set, default to white (#ffffff).
    themeColor: string = ''; // A color associated with this location, used for UI theming.
    discovered: boolean = false; // Whether the player has discovered this location; don't display undiscovered locations on the map.

    constructor(props: any) {
        Object.assign(this, props);
        // Generate ID if not provided, using the first non-host/non-player actor as context
        if (!this.id) {
            this.id = generateUuid();
        }
        if (!this.themeColor) {
            // Pick from the core game theme palette in index.scss.
            const colors = ['#8ab0cc', '#89cd87', '#7a7b6b', '#b98f6e', '#2e354d'];
            this.themeColor = colors[Math.floor(Math.random() * colors.length)];
        }
    }
}