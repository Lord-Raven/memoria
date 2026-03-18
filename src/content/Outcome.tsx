export enum OutcomeType {
    ITEM_FOUND = 'ITEM_FOUND',
    STAT_CHANGE = 'STAT_CHANGE',
    RELATIONSHIP_CHANGE = 'RELATIONSHIP_CHANGE',
    OTHER = 'OTHER',
}

export class Outcome {
    type: OutcomeType = OutcomeType.OTHER;
    description: string = ''; // Description of the outcome, e.g. "Found a mysterious key", "Increased strength by 2", "Relationship with Alice improved"
    details: any = {}; // Additional details relevant to the outcome, structure can vary based on type

    constructor(props: any) {
        Object.assign(this, props);
    }
}