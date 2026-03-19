import { v4 as generateUuid } from 'uuid';


// Customize this list to define which locations are restored when the map is cleared.
// Default list are locations in the city of Ardeia, which is the central location of the game. Other areas will be more dynamic.
// Ardeia is a fantasy sci-fi city with a mixture of heavy gothic architecture mixed with overgrown greenery and archaically high-tech machinery that feels ancient and alien at once.
const DEFAULT_ATLAS_LOCATIONS: Location[] = [
	{
		id: "ardeia-streets",
		name: "Streets of Ardeia",
		description: "",
		weight: 1,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/65f8275a-a798-4c0e-b5ea-22b7779c7b52/52c92a1a-e727-4419-af67-40e9cc5635e9.png',
		center: { x: 0.4, y: 0.6 },
		focalPoint: { x: 0.3, y: 0.2 },
		themeColor: "#5aa3d8",
		discovered: true,
	},
	{
		id: "ardeia-library",
		name: "The Library",
		description: "",
		weight: 0.45,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/959a3d92-2cff-48c9-bb6a-0d5dd9cef2e5/d66d42be-516d-4fb4-91b0-b3aae9ee1a2a.png',
		center: { x: 0.3, y: 0.55 },
		focalPoint: { x: 0.2, y: 0.4 },
		themeColor: "#d8a45a",
		discovered: true,

	},
	{
		id: "ardeia-temple",
		name: "The Temple",
		description: "",
		weight: 0.45,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/382bbbd6-5080-4c72-9c28-641efcbc87c0/84066e0e-9e62-4001-aaa1-a78c144fddef.png',
		center: { x: 0.35, y: 0.7 },
		focalPoint: { x: 0.4, y: 0.5 },
		themeColor: "#d86f5a",
		discovered: true,
	},
	{
		id: "ardeia-gardens",
		name: "The Gardens",
		description: "",
		weight: 0.45,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/1b1d80c6-08e6-42a6-9a94-3e643304b152/81a86b0f-4f6e-445c-afdb-db019e37ab0c.png',
		center: { x: 0.5, y: 0.65 },
		focalPoint: { x: 0.6, y: 0.4 },
		themeColor: '#39d78e',
		discovered: true,
	},
	{
		id: "ardeia-plaza",
		name: "The Plaza",
		description: "",
		weight: 0.45,
		imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/0d9d311c-9f3b-42b2-854b-894f4534c24c/f645dd78-90f7-4813-a4b1-566599446aaf.png',
		center: { x: 0.45, y: 0.5 },
		focalPoint: { x: 0.2, y: 0.4 },
		themeColor: '#d8c659',
		discovered: true,
	},
    {
        id: "slumbering-orchard",
        name: "Slumbering Orchard",
        description: "",
        weight: 0.5,
        imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/65176d74-9ec4-4f9c-936f-14d01c35a3c2/acbbed2a-c864-4a11-82e0-ba9329064dfd.png',
        center: { x: 0.3, y: 0.2 }, // southwest
        focalPoint: { x: 0.7, y: 0.8 },
        themeColor: "#7ecfbe",
        discovered: false,
    },
    {
        id: "bleached-earth",
        name: "Bleached Earth",
        description: "",
        weight: 0.7,
        imageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/192952d5-8305-4be3-b2ec-4c0373196d2f/48c61323-4000-4bf9-8337-766e324f130e.png',
        center: { x: 0.7, y: 0.1 }, // southeast
        focalPoint: { x: 0.5, y: 0.5 },
        // off-white, in theme:
        themeColor: "#e8e4d1",
        discovered: false,
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
    weight: number = 1; // A relative scale factor for the display size of this location.
    imageUrl: string = ''; // URL for an image representing this location, used as background in skits or location displays.
    center: { x: number, y: number } = { x: 0, y: 0 }; // Relative center point for positioning this location on the map
    focalPoint?: { x: number, y: number } = { x: 0.5, y: 0.5 }; // Relative image focus used when cropping this location into map cells.
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