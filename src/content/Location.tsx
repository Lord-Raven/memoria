import { v4 as generateUuid } from 'uuid';
import { createImageAssetUrlResolver } from './imageAssetUrl';
import { Stage } from '../Stage';
import { findBestNameMatch } from './Actor';

const getLocationImage = createImageAssetUrlResolver('locations');

// Customize this list to define which locations are restored when the map is cleared.
// Default list are locations in the city of Ardeia, which is the central location of the game. Other areas will be more dynamic.
// Ardeia is a fantasy sci-fi city with a mixture of heavy gothic architecture mixed with overgrown greenery and archaically high-tech machinery that feels ancient and alien at once.
export const DEFAULT_ATLAS_LOCATIONS: Location[] = [
	{
		id: "ardeia-library",
		name: "The Library",
		description: "",
		weight: 12,
		imageUrl: getLocationImage('ardeia/library.png'),
		center: { x: 0.07, y: 0.05 },
		focalPoint: { x: 0.2, y: 0.4 },
		lightColor: "#eeb36f",
		themeColor: "#d8a45a",
		discovered: true,

	},
	{
		id: "ardeia-temple",
		name: "The Temple",
		description: "",
		weight: 20,
		imageUrl: getLocationImage('ardeia/temple.png'),
		center: { x: 0.2, y: 0.07 },
		// center: { x: 0.15, y: 0.27 },
		focalPoint: { x: 0.4, y: 0.5 },
		lightColor: "#ffd478",
		themeColor: "#d86f5a",
		discovered: true,
	},
	{
		id: "ardeia-gardens",
		name: "The Gardens",
		description: "",
		weight: 12,
		imageUrl: getLocationImage('ardeia/gardens.png'),
		center: { x: 0.02, y: 0.34 },
		focalPoint: { x: 0.6, y: 0.4 },
		lightColor: "#b8e6cf",
		themeColor: '#339966',
		discovered: true,
	},
	{
		id: "ardeia-plaza",
		name: "The Plaza",
		description: "",
		weight: 15,
		imageUrl: getLocationImage('ardeia/plaza.png'),
		center: { x: 0.21, y: 0.25 },
		focalPoint: { x: 0.2, y: 0.4 },
		lightColor: "#eeeeee",
		themeColor: '#d8c659',
		discovered: true,
	},
	{
		id: "ardeia-nandemonankai",
		name: "Nandemonankai",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/b24d5a9c-9bb3-4896-8e3e-d1101f2fd4f0/5cb180c3-dcb8-4fc8-99ac-409380661b4d.png`,
		center: { x: 0.01, y: 0.15 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#eecccc",
		themeColor: '#ee9999',
		discovered: true,
	},
		{
		id: "ardeia-7loaves",
		name: "7Loaves",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/d81801f1-16e1-4f59-b73b-9dcd11e66c7e/35df21b5-af58-4f00-aff0-8d04cf3f6317.png`,
		center: { x: 0.16, y: 0.37 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ffebb0",
		themeColor: '#bb6633',
		discovered: true,
	},
		{
		id: "ardeia-brightwork-forge",
		name: "Brightwork Forge",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/fee93197-7253-4119-91d6-5f5baf3d6f09/dffda7d1-98f9-48a4-bb4d-d28525072eee.png`,
		center: { x: 0.31, y: 0.19 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ddddff",
		themeColor: '#ff5511',
		discovered: true,
	},
		{
		id: "ardeia-mels-pit",
		name: "Mel's Pit",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/a726a8b3-713d-4409-81bb-45c2a9255407/e56293b9-b4f2-4e37-a0cf-0940417ede52.png`,
		center: { x: 0.10, y: 0.30 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "rgb(255, 223, 202)",
		themeColor: '#9966cc',
		discovered: true,
	},
		{
		id: "ardeia-miras-miracle-metalworks",
		name: "Mira's Miracle Metalworks",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/88b0eab5-4128-4dc7-8795-b45e198c349c/e0f3469c-d499-4f48-be67-4b84c7564f4a.png`,
		center: { x: 0.3, y: 0.03 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ffe4e4",
		themeColor: '#ee9999',
		discovered: true,
	},
		{
		id: "ardeia-the-amber-drop",
		name: "The Amber Drop",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/98eadb5c-67fa-43ab-9c3a-6411284eadd0/4cba040c-6e06-425a-83ce-131e733c2583.png`,
		center: { x: 0.28, y: 0.33 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#fff2d7",
		themeColor: '#ffaa33',
		discovered: true,
	},
		{
		id: "ardeia-yarrow-rest",
		name: "Yarrow Rest",
		description: "",
		weight: 10,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/85b0d907-599d-40df-bdbe-c8aedf0b87de/8b401827-ff62-478f-9a1e-688a8f78f620.png`,
		center: { x: 0.09, y: 0.21 },
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#93ecec",
		themeColor: '#1199aa',
		discovered: true,
	},

	// Near locations:
    {
        id: "slumbering-orchard",
        name: "Slumbering Orchard",
        description: "",
        weight: 20,
		imageUrl: getLocationImage('outside/slumbering_orchard.png'),
        center: { x: 0.26, y: 0.62 }, // southwest
        focalPoint: { x: 0.7, y: 0.8 },
		lightColor: "#74919f",
        themeColor: "#7ecfbe",
        discovered: true,
    },
	{
		id: "pilgrimage",
		name: "Pilgrimage",
		description: "",
		weight: 25,
		imageUrl: getLocationImage('outside/pilgrimage.png'),
		center: { x: 0.5, y: 0.5 }, // center
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#eeeedd",
		themeColor: "#d86f5a",
		discovered: true,
	},
	{
        id: 'the-loom',
        name: 'The Loom',
        description: '',
        weight: 20,
		imageUrl: getLocationImage('outside/loom.png'),
        center: { x: 0.48, y: 0.2 }, // northeast
        focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#d7c091",
        themeColor: '#d17ed8',
        discovered: true,
    },
	// Mid-far:
    {
        id: "bleached-earth",
        name: "Bleached Earth",
        description: "",
        weight: 30,
		imageUrl: getLocationImage('outside/bleached_earth.png'),
        center: { x: 0.37, y: 0.86 }, // south
        focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#eeeeee",
        themeColor: "#e8e4d1",
        discovered: true,
    },
	{
		id: "blind-spire",
		name: "Blind Spire",
		description: "",
		weight: 20,
		imageUrl: getLocationImage('outside/blind_spire.png'),
		center: { x: 0.7, y: 0.3 }, // far east
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ff99aa",
		themeColor: '#ff6699',
		discovered: true,
	},
	// Far:
	{
		id: "sunken-core",
		name: "Sunken Core",
		description: "",
		weight: 30,
		imageUrl: getLocationImage('outside/sunken_core.png'),
		center: { x: 0.9, y: 0.8 }, // far southeast
		focalPoint: { x: 0.5, y: 0.5 },
		// light red/orange brown
		lightColor: "#ffdd99",
		themeColor: '#ff9966',
		discovered: true,
	},
	{
		id: "the-cradle",
		name: "The Cradle",
		description: "",
		weight: 25,
		imageUrl: getLocationImage('outside/cradle.png'),
		center: { x: 0.1, y: 0.9 }, // far southwest
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#bbbbee",
		themeColor: '#9999cc',
		discovered: true,
	},
	{
		id: "the-threshold",
		name: "The Threshold",
		description: "",
		weight: 25,
		imageUrl: getLocationImage('outside/threshold.png'),
		center: { x: 0.9, y: 0.2 }, // far northeast
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ffffdd",
		themeColor: '#ccffaa',
		discovered: true,
	},
	{
		id: "the-shells",
		name: "The Shells",
		description: "",
		weight: 25,
		imageUrl: `https://avatars.charhub.io/avatars/uploads/images/gallery/file/e5e6a460-2555-4c69-804e-d9e776eeacf6/cb993e51-dd1a-42d0-b831-21d85f25ce29.png`,
		center: { x: 0.65, y: 0.94 }, // far south
		focalPoint: { x: 0.5, y: 0.5 },
		lightColor: "#ddccff",
		themeColor: '#bb99ff',
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

export function getLinkedLocationLore(locationName: string, stage: Stage) {
	return findBestNameMatch(locationName, stage.getSave().lorebook?.filter(lore => lore.type === 'location') ?? [], 'title');
}

export function getLocationDescription(locationId: string, stage: Stage) {
	const location = stage.getSave().atlas[locationId];
	if (!location) {
		return '';
	}

	const lore = getLinkedLocationLore(location.name, stage);
	return lore?.content ?? location.description;
}

export function updateLocationDescription(locationId: string, description: string, stage: Stage) {
	const location = stage.getSave().atlas[locationId];
	if (!location) {
		return;
	}

	const lore = getLinkedLocationLore(location.name, stage);
	if (lore) {
		lore.content = description;
		return;
	}

	location.description = description;
}

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