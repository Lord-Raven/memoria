import { v4 as generateUuid } from 'uuid';

export class Location {
    id: string = '';
    name: string = '';
    description: string = '';
    weight: number = 1; // A relative scale factor for the display size of this location.
    maxRadius: number = 0; // Optional cap for map cell spread; 0 means use derived defaults.
    imageUrl: string = ''; // URL for an image representing this location, used as background in skits or location displays.
    center: { x: number, y: number } = { x: 0, y: 0 }; // Relative center point for positioning this location on the map

    constructor(props: any) {
        Object.assign(this, props);
        // Generate ID if not provided, using the first non-host/non-player actor as context
        if (!this.id) {
            this.id = generateUuid();
        }
    }
}