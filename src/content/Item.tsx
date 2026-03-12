import { v4 as generateUuid } from 'uuid';

export class Item {
    id: string; // UUID
    name: string = ''; // Display name
    description: string = ''; // Description of the item
    author: string = ''; // Author of the item, for crediting purposes

    constructor(props: any) {
        Object.assign(this, props);
        this.id = generateUuid();
    }
}