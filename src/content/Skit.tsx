import { Emotion } from "./Emotion";
import { v4 as generateUuid } from 'uuid';

export enum SkitType {
    GAME_INTRO = 'GAME_INTRO',
    SOCIAL = 'SOCIAL',
    ADVENTURE = 'ADVENTURE',
}

export class Skit {
    id: string = '';
    skitType: SkitType = SkitType.SOCIAL;
    script: ScriptEntry[] = [];
    initialActors: string[] = []; // List of Actor IDs present in this skit
    initialLocationId: string = ''; // Initial location for the skit, can be used to set background or context
    
    constructor(props: any) {
        Object.assign(this, props);
        // Generate ID if not provided, using the first non-host/non-player actor as context
        if (!this.id) {
            this.id = generateUuid();
        }
    }
}

export class ScriptEntry {
    speakerId: string = ''; // Actor ID of speaker
    message: string = ''; // Message content for this script entry
    speechUrl: string = ''; // Optional URL for text-to-speech audio
    actorEmotions: {[key: string]: Emotion} = {}; // Map of emotion changes by actor ID
    updatedActors: string[]|undefined = undefined; // List of Actor IDs now in the skit as of this entry; if undefined, assume same as previous entry
    updatedLocationId: string|undefined = undefined; // Updated location for this entry, if any; if undefined, assume same as previous entry
    endScene?: boolean = false; // Optional flag to indicate if this entry ends the scene
    
    constructor(props: any) {
        Object.assign(this, props);
    }
}