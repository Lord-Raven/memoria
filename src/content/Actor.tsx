import { v4 as generateUuid } from 'uuid';
import { Emotion, EMOTION_PROMPTS, EmotionPack } from './Emotion';
import { Stage } from '../Stage';
import { AspectRatio } from '@chub-ai/stages-ts';
import { createImageAssetUrlResolver } from './imageAssetUrl';
import { act } from 'react';

const getBaseImage = createImageAssetUrlResolver('characters');

export enum ActorType {
    PLAYER = 'PLAYER', // Primary player, controlled by the user; player is also a prisoner, but treated distinctly
    WARDEN = 'WARDEN', // Cassiel, special role that needs to be treated distinctly
    PRISONER = 'PRISONER', // Most characters

}

// An appearance represents an outfit or physical transformation that can be applied to a specific actor; each appearance comes with a full set of emotions
export type Appearance = {
    id: string;
    name: string;
    description: string;
    emotionPack: EmotionPack;
}

export class Actor {
    id: string = ''; // UUID
    type: ActorType = ActorType.PRISONER; // Default to PRISONER
    name: string = ''; // Display name
    fullPath: string = ''; // Path to original character definition
    sampleImageUrl: string = ''; // Original reference image
    profile: string = ''; // Personality profile description of character
    appearanceId: string = ''; // The ID of the current appearance (outfit/description) for this actor; if empty, use the first appearance index
    appearances: Appearance[] = []; // Sets of appearances representing outfits or transformations for this actor; each appearance has a full set of emotions
    themeColor: string = ''; // Theme color (hex code)
    themeFontFamily: string = ''; // Font family stack for CSS styling
    voiceId: string = ''; // Voice ID for TTS
    characterArc: string = ''; // A character arc summary that is updated after skits, to better reflect changes or developments in the character's personality, motives, or relationships. This is used to inform future skits and interactions with this character, and can be referenced in the script prompts as well.

    /**
     * Rehydrate an Actor from saved data
     */
    static fromSave(savedActor: any): Actor {
        const actor = Object.create(Actor.prototype);
        Object.assign(actor, savedActor);
        return actor;
    }

    constructor(props: any) {
        Object.assign(this, props);
        if (!this.id) {
            this.id = generateUuid();
        }
    }
}


// extra space temporarily denotes final path.
export const SUPPORTED_CHARACTERS: Partial<Actor>[] = [
    {
        id: `cassiel`,
        name: 'Cassiel',
        type: ActorType.WARDEN,
        profile: 'A stern and enigmatic warden who oversees the prison. Cassiel is known for their strict rules and mysterious past.',
        sampleImageUrl: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png',
        appearances: [{
            id: 'default',
            description: 'Cassiel, the Warden, is a towering goddess in flowing white robes.',
            name: 'Celestial Robes',
            emotionPack: {
                base: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png',
                neutral: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png'
            }
        }],
        appearanceId: 'default',
        fullPath: '',
        characterArc: '',
        themeColor: '#a6e683',
        themeFontFamily: 'Georgia, serif',
        voiceId: 'calm_female_20s'
    }, /*{
        name: 'Aeriya', 
        fullPath: 'SilverFlame/aeriya-361950a8a9ba', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8118f416-076c-46c0-b6ec-cd162b928e21/58f1442e-3c03-4740-b138-6c100bcc20bf.png'
    }, {
        name: 'Amat-Ea', 
        fullPath: 'adelsvard/amat-ea-18df50a603a5', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6b8ac58-f648-4c87-8d67-3d6c63adefad/527d8308-8594-4254-b4e1-5efde4ad9cc1.png'
    }, */{
        name: ' Arca-7', 
        fullPath: 'NobodyNos/arca-7-tactical-support-brat-8c439a869a73', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/c755a79e-2dbe-4fcb-9aa5-5bae55f11778/f7d4658a-57c2-4390-ba8f-6c8988899667.png'
    }, /*{
        name: 'Astraea', 
        fullPath: 'SteakedGamer/astraea-1e7f9aeca6e1', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/33805aff-79d6-46ab-bc2c-3eb74b859084/9b010521-17bc-4a68-93a4-38446eafba47.png'
    }, {
        name: 'Caedmon', 
        fullPath: 'Lellan/caedmon-the-brightwork-smith-af9d71cfe8ba', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6a6deed-e2e1-47a8-a4f6-439a6b011749/d0292798-e93f-4824-87c3-4d5205d99afa.png'
    }, */{ 
        name: 'Elowen', 
        fullPath: 'Richarrd/elowen-bridgewater-f2bfac00b888', 
        profile: 'Calm, controlled, and intellectually precise. She observes and analyzes before speaking in a measured, deliberate tone. Publicly, she is a composed reformist who values systems, efficiency, and moral clarity over sentiment or chaos.',
        characterArc: 'To seize ideological leadership within Ardeia and shape its future direction. She accepts the system but believes it must aim higher than mere survival, and she intends to be the one to guide it there.',
        themeColor: '#2C3E50',
        themeFontFamily: '"Times New Roman", serif',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/4a2fa754-83d7-423b-af96-1154857d6872/c7a6af54-16ed-45db-bbd0-243867d111a3.png',
        appearances: [{
            id: 'default',
            name: 'Tailored Peasant Garb',
            description: 'A tall, fine-boned woman with a severe pale-blonde pixie cut, a thin braid, and glacial blue eyes. Her subtle elfin features are sharp and analytical. She wears tailored, practical peasant clothing in earth tones, everything intentional and devoid of decoration.',
            emotionPack: {
                base: 'https://media.charhub.io/70e3344a-6859-425e-97d8-7f1bb34a4378/c7114535-4ca4-415e-8c81-e93641df3bb8.png',
                neutral: 'https://media.charhub.io/054cc56b-3e4e-4078-b5a0-6372356a1fdc/c2aa2ee3-6032-4008-a0bb-914eebaa99f7.png',
                exhaustion: 'https://media.charhub.io/183daf13-12c7-4a52-9b96-08961fc65af5/8d5ad846-cc53-4fdf-aad1-38138648fbc3.png'
            }
        }],
        appearanceId: 'default',
    }, { 
        name: 'Lumi', 
        fullPath: 'DarkSkies/lumen-healer-writing-faster-than-she-s-forgetting-9f715a662e32', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/44296727-c09e-46f4-b90e-d49a308777b8/9f020d4a-7990-46b0-ac90-27bf0f0e9939.png'
    }, {
        name: 'Lyra', 
        fullPath: 'Birb_Brain/lyra-scavenger-stray-survivor-fa0621f65589', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/79b9384b-5a85-4ff9-86b0-0bca7b9a01b3/6d7c9cda-f13e-451a-ac2f-ea17d21c9d83.png',
    }, { 
        name: 'Mallory', 
        fullPath: 'SKU11/mallory-the-supposed-champion-of-a-dead-god-7ceb7a1c461b', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8bbd81d1-29bf-45e0-a653-b86ee33a6a4c/b96f6450-8367-4a8a-9cf7-ea6fdb070e13.png',
        /*appearances: [{
            id: 'default',
            name: 'Deceiver Chic',
            description: 'A tall, lean woman with purplish hair fading to orange tied in twintails with a curtain of bangs. Sharp orange eyes dart behind thin, round glasses—a part of her human disguise, which includes a black capelet and purple vest over a white blouse, with black pants and gloves.',
            emotionPack: {
                base: 'https://media.charhub.io/fef3dde9-48fb-4ba6-9d54-1606b5f5d926/6b38d1f2-9ad9-440b-91e2-d942eee89b17.png',
                neutral: 'https://media.charhub.io/3c039253-29f4-45e5-b145-91c9fc96a56c/f89a8cb2-7d62-42ec-9597-8ad2ef4e6bf9.png',
                approval: 'https://media.charhub.io/4a4d339b-08bf-4c7c-a99b-f4abc4be92b4/5c4d72ad-c8c3-495b-8f3c-6cb12ed61b25.png',
            }

        }],
        appearanceId: 'default'*/
    }, /*{ 
        name: 'Mel', 
        fullPath: 'ashen1n/melina-mel-argyra-68a8d1c1c55a', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a02ae02e-b798-4ef5-bd6f-2f26c47593e4/16d1ad89-ae10-43c0-bc16-eaed773849ce.png'
    }, {
        name: 'Millia', 
        fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/b564f9af-0ffe-49fc-aefe-c9c6563688fd/4df9d97d-165c-4c90-aa1b-aa7e8787b14d.png'
    }, {
        name: 'Milliette',
        fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/adb4022f-290c-44cf-b5eb-9350bbb5d5d4/2a3399c5-77ce-4e18-8087-f8d6a25b68bf.png'
    },*/ {
        name: 'Mira', 
        fullPath: 'Derpnomicon/mira-the-tomboy-mechanic-c77eb7d4c86e', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/39a4bd46-60f0-486e-9127-72470ef82c17/cd3a5df1-96c2-4621-9246-6e0145e990a3.png'
    }, /*{
        name: 'Nadiya', 
        fullPath: 'xsenn/nadiya-18576a12939e', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/612f24c2-3742-4963-8f3e-10afd2193833/1d8a6e1f-cee0-4c40-b49a-e79dba4c64cd.png'
    },*/{ 
        name: 'Persephone', 
        fullPath: 'Sancay/persephone-the-normal-barmaid-a45c371b9af0', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a3d2a9e2-3bbc-4814-a985-00211e64ced0/ce59e51e-08c6-499c-9845-8c0644df4c76.png'
    }, {
        name: 'Reitia',
        fullPath: '7leaf/reitia-overwritten-rabbit-30a97d6be1ef',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/37db624a-cf8c-4010-b483-8598b2f9771e/2008acca-2532-4cf0-aca8-8b95e090dcc4.png'
    }, {
        name: 'Sam',
        fullPath: 'Beastmastaa/the-living-scythe-sam-a97cfbc256a1',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/aad73514-fc09-4241-ac38-851d7033e253/b223f2ae-44e9-4802-a719-5b46099999c4.png',
        appearances: [{
            id: 'default',
            name: 'Scythe Form',
            description: 'A five-foot-long, elegantly curved scythe with a haft of dark, polished wood and a blade of shimmering, silvery metal that seems to drink in the light. The weapon is immaculate and radiates a faint, watchful presence.',
            emotionPack: {
                base: 'https://media.charhub.io/b203e2c2-d096-4302-95bc-a7522562e9f7/e4192cf5-bd79-4b9a-9ef6-8a6f603575a8.png',
                neutral: 'https://media.charhub.io/b203e2c2-d096-4302-95bc-a7522562e9f7/e4192cf5-bd79-4b9a-9ef6-8a6f603575a8.png'
            }
        }],
        appearanceId: 'default'
    },/* {
        name: 'Soren',
        fullPath: 'Ruranel/soren-rokhe-d7bcedc04e37',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a772b885-a21f-4d65-80dd-c164e4a163e1/f342e5bb-a80c-4e20-9fdd-0753bf07d7e7.png'
    }, {
        name: 'Thessaly',
        fullPath: 'Forgotten_Stories/thessaly-the-unbidden-8c09bb62bf58',
        sampleImageUrl: ''
    }, {
        name: 'Vash',
        fullPath: 'XxSiCxX/vash-romina-ghosts-of-another-world-735a31a4e894',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/f7504502-57f0-49ef-9178-b4f053c9bb37/e09c6364-4e67-4ccb-b744-c4748316335f.png'
    },*/

];

// Mapping of voice IDs to a description of the voice, so the AI can choose an ID based on the character profile.
export const VOICE_MAP: {[key: string]: string} = {
    '751212e5-a871-45c7-b10b-6f42a5785954': 'feminine - posh and catty',
    '03a438b7-ebfa-4f72-9061-f086d8f1fca6': 'feminine - calm and soothing', // HQ Female Lowrange
    'a2533977-83cb-4c10-9955-0277e047538f': 'feminine - energetic and lively', // LQ Female Midrange
    '057d53b3-bb28-47f1-9c19-a85a79851863': 'feminine - low and warm', // HQ Female Midrange
    '6e6619ba-4880-4cf3-a5df-d0697ba46656': 'feminine - high and soft', // LQ Female Highrange
    'd6e05564-eea9-4181-aee9-fa0d7315f67d': 'masculine - cool and confident', // HQ Male Lowrange
    'e6b74abb-f4b2-4a84-b9ef-c390512f2f47': 'masculine - posh and articulate', // HQ Male Midrange
    'bright_female_20s': 'feminine - bright and cheerful',
    'resonant_male_40s': 'masculine - resonant and mature',
    'gentle_female_30s': 'feminine - gentle and caring',
    'whispery_female_40s': 'feminine - whispery and mysterious',
    'formal_female_30s': 'feminine - formal and refined',
    'professional_female_30s': 'feminine - professional and direct',
    'calm_female_20s': 'feminine - calm and soothing',
    'light_male_20s': 'masculine - light and thoughtful',
    'animated_male_20s': 'masculine - hip and lively',
};

const FULL_IMAGE_WIDTH = 1024;
const FULL_IMAGE_HEIGHT = 1280;
const BASE_IMAGE_WIDTH = 944;
const BASE_IMAGE_HEIGHT = 1180;

async function normalizeBaseSourceImage(imageUrl: string): Promise<string> {
    if (!imageUrl) {
        return imageUrl;
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loadedImage = new Image();
        loadedImage.crossOrigin = 'anonymous';
        loadedImage.onload = () => resolve(loadedImage);
        loadedImage.onerror = () => reject(new Error(`Failed to load base source image: ${imageUrl}`));
        loadedImage.src = imageUrl;
    });

    const contextCanvas = document.createElement('canvas');
    contextCanvas.width = FULL_IMAGE_WIDTH;
    contextCanvas.height = FULL_IMAGE_HEIGHT;

    const context = contextCanvas.getContext('2d');
    if (!context) {
        return imageUrl;
    }

    const scale = Math.min(
        BASE_IMAGE_WIDTH / image.naturalWidth,
        BASE_IMAGE_HEIGHT / image.naturalHeight
    );
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    const imageOffsetX = (BASE_IMAGE_WIDTH - scaledWidth) / 2;
    const imageOffsetY = (BASE_IMAGE_HEIGHT - scaledHeight) / 2;
    const baseOffsetX = (FULL_IMAGE_WIDTH - BASE_IMAGE_WIDTH) / 2;
    const baseOffsetY = FULL_IMAGE_HEIGHT - BASE_IMAGE_HEIGHT;

    context.clearRect(0, 0, FULL_IMAGE_WIDTH, FULL_IMAGE_HEIGHT);
    context.drawImage(
        image,
        baseOffsetX + imageOffsetX,
        baseOffsetY + imageOffsetY,
        scaledWidth,
        scaledHeight
    );

    return contextCanvas.toDataURL('image/png');
}

export async function loadSupportedActor(name: string, stage: Stage): Promise<Actor|null> {
    // Canon data within the stage:
    const newActor = new Actor(SUPPORTED_CHARACTERS.find(char => char.name === name));

    // Retrieve data from Chub to fill in possible gaps:
    let definition: any = null;
    try {
        if (newActor.fullPath) {
            const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', newActor.fullPath));
            definition = (await response.json()).node.definition;
        }
    } catch (error) {
        console.warn(`Failed to fetch character details for ${name} at path ${newActor.fullPath}:`, error);
    }

    if (definition) {
        console.log(`Loaded character definition for ${name} from Chub:`);
        console.log(definition);
        // Even if nothing else, use the definition voice ID over whatever is in the stage.
        if (definition.voice_id && !VOICE_MAP[definition.voice_id]) {
            newActor.voiceId = definition.voice_id;
        }

        // if newActor is missing critical fields like personality or appearances, distill these details to fill the gaps
        if (!newActor.profile || !newActor.appearances) {
            return await distillActor(newActor, definition, stage);
        }
    }

    return newActor;
}

export async function distillActor(actor: Actor, definition: any, stage: Stage): Promise<Actor|null> {
    console.log('Loading reserve actor:', definition.name);
    console.log(definition);

    // Attempt to substitute words to avert bad content into something more agreeable (if the distillation still has these, then drop the card).
    const bannedWordSubstitutes: {[key: string]: string} = {
        // Try to age up some terms in the hopes that the character can be salvaged.
        'underage': 'young adult',
        'adolescent': 'young adult',
        'youngster': 'young adult',
        'teen': 'young adult',
        'highschooler': 'young adult',
        'childhood': 'formative years',
        'childish': 'bratty',
        'child': 'young adult',
        // Don't bother with these; just set it to the same word so it gets discarded.
        'toddler': 'toddler',
        'infant': 'infant',
        // Assume that these words are being used in an innocuous way, unless they come back in the distillation.
        'kid': 'joke',
        'baby': 'honey',
        'minor': 'trivial',
        'old-school': 'retro',
        'high school': 'college',
        'school': 'college'};


    // Preserve content while removing JSON-like structures.
    definition.personality = definition.personality.replace(/{/g, '(').replace(/}/g, ')');

    // Take this data and use text generation to get an updated distillation of this character, including a physical description.
    const generationRequest = stage.generator.textGen({
        prompt: `{{messages}}This is preparatory request for structured and formatted game content.` +
            `\n\nPremise: This game is a post-apocalyptic science-fantasy game in which the world is an unknowable relic of its past self. ` +
            `The denizens of this world—referred to as 'prisoners'—have been pulled from across time, resulting in a diverse and eclectic mix of characters. Most have only vague memories of their past lives, ` +
            `but all have rich and detailed personalities that persist and even new motives driving their existence in a new world. ` +
            `All prisoners live in the sole populated city of Ardeia and serve its Warden, Cassiel, an eight-foot, angelic woman who oversees the city's operations with a mix of benevolence and authority. ` +
            `The player of this game, ${stage.getPlayerActor()?.name || 'Player'}, is one of the many prisoners, bearing the signature bracer that binds them to Ardeia and the Warden. ` +
            `The prisoners work to keep the city running while also exploring the Outside, beyond the cities walls and Barriers. Some are new arrivals, while others have been here for centuries. ` +
            `They find all manner of otherworldly artifacts and remnants among the mysterious, war-torn, or overgrown ruins of the old world, including relics, constructs, forma, and errata. ` +
            `\n\nThe Original Details below describe a character of this world (${actor.name}) to convert into a set of defined fields for this game. ` +
            `\n\n` +
            `Original Details about ${actor.name}:\n ${definition.personality}\n\n` +
            `Available Voices:\n` +
            Object.entries(VOICE_MAP).map(([voiceId, voiceDesc]) => ' - ' + voiceId + ': ' + voiceDesc).join('\n') +
            `Instructions: After carefully considering this description and the rules provided, generate a concise breakdown for a character based upon these details in the following strict format:\n` +
            `System: NAME: Their simple name\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `OUTFIT: A one- to two-word name for the character's current outfit that matches the description.\n` +
            `PROFILE: A brief summary of the character's personality traits, mannerisms, and public persona. Focus on what others would notice immediately about them.\n` +
            `MOTIVE: The character's hidden agenda, underlying emotional drive, or what they hope to achieve here. This may align with or differ from their profile. Keep it concise but revealing of their true intentions.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender (foremost) and personality.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A font stack, or font family that reflects the character's personality; this will be embedded in a CSS font-family property.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She wears a simple, utilitarian outfit made from durable materials.\n` +
            `OUTFIT: Adventurer's Gear\n` +
            `PROFILE: Jane is confident and determined, quick-witted, and fiercely independent. Known for her sharp wit and strong presence, she has a commanding aura that draws attention.\n` +
            `MOTIVE: Deep down, Jane is driven by a need to prove she's worthy of love despite her past betrayals. She's here looking for someone who will challenge her and see beyond her tough exterior.\n` +
            `VOICE: 03a438b7-ebfa-4f72-9061-f086d8f1fca6\n` +
            `COLOR: #666666\n` +
            `FONT: Calibri, sans-serif\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 400,
    });
    stage.generationPromises[`distilling_actor/${actor.fullPath}`] = generationRequest.finally(() => {
            console.log('Finished generating distillation for actor:', actor.name);
            delete stage.generationPromises[`distilling_actor/${actor.fullPath}`];
    });
    const generatedResponse = await generationRequest;
    console.log('Generated character distillation:');
    console.log(generatedResponse);
    // Parse the generated response into components:
    const lines = generatedResponse?.result.split('\n').map((line: string) => line.trim()) || [];
    const parsedData: any = {};
    // data could be erroneously formatted (for instance, "1. Name:" or "-Description:"), so be resilient:
    for (let line of lines) {
        // strip ** from line:
        line = line.replace(/\*\*/g, '');
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            // Find last word before : and use that as the key. Ignore 1., -, *. There might not be a space before the word:
            const keyMatch = line.substring(0, colonIndex).trim().match(/(\w+)$/);
            if (!keyMatch) continue;
            const key = keyMatch[1].toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            // console.log(`Parsed line - Key: ${key}, Value: ${value}`);
            parsedData[key] = value;
        }
    }

    // Validate that parsedData['color'] is a valid hex color, otherwise assign a random default:
    const themeColor = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i.test(parsedData['color']) ?
            parsedData['color'] :
            ['#788ebdff', '#d3aa68ff', '#75c275ff', '#c28891ff', '#55bbb2ff'][Math.floor(Math.random() * 5)];

    // Fill in actor, but favor any current settings:
    actor.profile = actor.profile || parsedData['profile'] || '';
    actor.characterArc = actor.characterArc || parsedData['motive'] || '';
    actor.voiceId = actor.voiceId || parsedData['voice'] || '';
    actor.themeColor = actor.themeColor || themeColor;
    actor.themeFontFamily = actor.themeFontFamily || parsedData['font'] || 'Arial, sans-serif';
    actor.appearances = actor.appearances.length > 0 ? actor.appearances : [];

    if (actor.appearances.length === 0) {

        const defaultAppearanceName = parsedData['outfit'] || 'Default Outfit';
        const defaultAppearanceDescription = (parsedData['description'] || '');

        // Add shell of an initial appearance
        actor.appearances.push({
            id: generateUuid(),
            name: defaultAppearanceName,
            description: defaultAppearanceDescription,
            emotionPack: {}, // This will be filled in later when the player views this character and the emotions are generated on demand.
        });
    }

    if (actor.appearanceId === '') {
        actor.appearanceId = actor.appearances[0].id;
    }

    const currentAppearance = getActiveAppearance(actor);
    if (!currentAppearance.emotionPack['base']) {
        // Kick off base image generation:
        await generateBaseActorImage(actor, stage, false, true, actor.appearanceId, actor.sampleImageUrl);
    } else if (!currentAppearance.emotionPack['neutral']) {
        // Kick off neutral image generation:
        await generateEmotionImage(actor, Emotion.neutral, stage, false, actor.appearanceId);
    }
    return actor;
}

function getActiveAppearance(actor: Actor): Appearance {
    if (actor.appearances.length === 0) {
        // Return a default appearance if none exist to avoid errors; this will be updated with real data when the emotion images are generated.
        return {
            id: '',
            name: 'Default Appearance',
            description: '',
            emotionPack: {}
        };
    } else if (!actor.appearanceId) {
        return actor.appearances[0];
    } else {
        return actor.appearances.find(appearance => appearance.id === actor.appearanceId) || actor.appearances[0];
    }
}

function getAppearanceById(actor: Actor, appearanceId: string = ''): Appearance {
    const resolvedAppearanceId = appearanceId || actor.appearanceId;
    return actor.appearances.find((appearance) => appearance.id === resolvedAppearanceId) || getActiveAppearance(actor);
}

export function getEmotionImage(actor: Actor, emotion: Emotion | string, stage?: Stage, appearanceId: string = ''): string {
    const targetAppearanceId = appearanceId || actor.appearanceId;
    if (!actor.appearances || actor.appearances.length === 0) {
        return '';
    }
    const emotionKey = typeof emotion === 'string' ? emotion : emotion;
    const emotionPack = getAppearanceById(actor, targetAppearanceId).emotionPack;
    const emotionUrl = emotionPack[emotionKey];
    const neutralUrl = emotionPack['neutral'] || emotionPack['base'];
    const fallbackUrl = neutralUrl || actor.sampleImageUrl || '';

    // Check if we need to generate the image
    if (stage && (emotion === 'neutral' /*|| !stage.getSave().disableEmotionImages*/) && (!emotionUrl || emotionUrl === actor.sampleImageUrl || emotionUrl === emotionPack['base'] || (emotionKey !== 'neutral' && emotionUrl === neutralUrl))) {
        // Kick off generation in the background (don't wait)
        generateEmotionImage(actor, emotion as Emotion, stage, false, targetAppearanceId);
    }

    // Return the emotion image or fallback
    return emotionUrl || fallbackUrl;
}

function setEmotionImageUrl(actor: Actor, emotion: Emotion | string, appearanceId: string = '', url: string = '') {
    const targetAppearanceId = appearanceId || actor.appearanceId;
    const emotionPack = getAppearanceById(actor, targetAppearanceId).emotionPack;
    emotionPack[emotion] = url;
}

export async function generateBaseActorImage(
    actor: Actor,
    stage: Stage,
    force: boolean = false,
    fromAvatar: boolean = true,
    appearanceId: string = '',
    sourceImageUrl: string = ''
): Promise<void> {
    const targetAppearanceId = appearanceId || actor.appearanceId;

    console.log(`Populating images for actor ${actor.name} (ID: ${actor.id})`);
    // If the actor has no neutral emotion image in their emotion pack, generate one based on their description or from the existing avatar image
    if (!getAppearanceById(actor, targetAppearanceId).emotionPack['neutral'] || force) {
        console.log(`Generating base emotion image for actor ${actor.name}`);
        // Want to clear in-progress stuff if forcing
        if (force) {
            getAppearanceById(actor, targetAppearanceId).emotionPack = {};
            delete stage.generationPromises[`actor/${actor.id}`];
        }
        let imageUrl = '';
        let baseSourceImage = sourceImageUrl || actor.sampleImageUrl || '';
        
        if (!baseSourceImage || !fromAvatar) {
            console.log(`Generating new image for actor ${actor.name} from description`);
            // Use stage.makeImage to create a neutral expression based on the description
            imageUrl = await stage.makeImage({
                prompt: `Illustrate this character in a rough, messy, anime-inspired concept-art style with thick brush strokes. ` +
                    `${getAppearanceById(actor, targetAppearanceId).description}. Create a waist-up portrait of this character with a neutral expression and pose, placed on a light gray background. `,
                aspect_ratio: AspectRatio.PHOTO_VERTICAL
            }, '');
            baseSourceImage = imageUrl || '';
        } else {
            // Need to adjust the base image to the right size/aspect ratio, and add a margin
            /*try {
                baseSourceImage = await normalizeBaseSourceImage(baseSourceImage);
                console.log(baseSourceImage);
            } catch (error) {
                console.warn('Failed to normalize base source image, using original source image instead.', error);
            }*/

            // Use stage.makeImageFromImage to create a base image.
            imageUrl = await stage.makeImageFromImage({
                image: await getDataUrl(baseSourceImage),
                prompt: `If necessary, alter this character to match their description:\n` +
                    `${getAppearanceById(actor, targetAppearanceId).description}\n` +
                    `Disregard anything below the waist. This image remains a waist-up portrait. Swap the background to a monotone gradient that clashes with the character's palette.\n` +
                    `Preserve the messy, anime-inspired concept-art style with painterly brush strokes, lustrous colors, and rich specular highlights.`,
                remove_background: false,
                transfer_type: 'edit'
            }, '');
        }
        
        console.log(`Generated base emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        setEmotionImageUrl(actor, 'base', targetAppearanceId, imageUrl || '');

        if (force) {
            // Invalidate all other emotions
            getAppearanceById(actor, targetAppearanceId).emotionPack = {'base': getEmotionImage(actor, 'base', stage, targetAppearanceId)};
        }
    }
    await generateEmotionImage(actor, Emotion.neutral, stage, false, targetAppearanceId);
}

async function getDataUrl(baseImageUrl: string): Promise<string> {
        // If baseImageUrl is an assets URL, we need to convert it to a data URL:
        if (baseImageUrl && baseImageUrl.startsWith('/assets/')) {
            const response = await fetch(baseImageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            baseImageUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
            });
        }
        return baseImageUrl;
}

export async function generateEmotionImage(actor: Actor, emotion: Emotion, stage: Stage, force: boolean = false, appearanceId: string = ''): Promise<string> {
    const targetAppearanceId = appearanceId || actor.appearanceId;
    console.log(`Generating ${emotion} emotion image for actor ${actor.name} (ID: ${actor.id}) with appearance ID: ${targetAppearanceId}`);
    if (getEmotionImage(actor, 'base', stage, targetAppearanceId) && (!stage.generationPromises[`actor/${actor.id}`] || force)) {
        console.log(`Generating ${emotion} emotion image for actor ${actor.name}`);
        // Create a dummy promise to prevent duplicate generation while this is in progress; this will be deleted when the generation is complete
        stage.generationPromises[`actor/${actor.id}`] = new Promise(() => {});

        const emotionPrompt = stage.getSave().emotionPrompts?.[emotion] || EMOTION_PROMPTS[emotion];
        console.log(`Using emotion prompt for ${emotion}: ${emotionPrompt}`);

        let baseImageUrl = await getDataUrl(getEmotionImage(actor, 'base', stage, targetAppearanceId));

        const imageUrl = await stage.makeImageFromImage({
            image: baseImageUrl || '',
            prompt: `${emotionPrompt}\nPreserve their outfit and overall appearance, but adjust their facial expression and body language to clearly convey this emotion. `,
            remove_background: true,
            transfer_type: 'edit'
        }, '');
        delete stage.generationPromises[`actor/${actor.id}`];
        console.log(`Generated ${emotion} emotion image for actor ${actor.name}: ${imageUrl || ''}`);
        getAppearanceById(actor, targetAppearanceId).emotionPack[emotion] = imageUrl || '';
        return imageUrl || '';
    }
    return '';
}

export function getLinkedActorLore(actorName: string, stage: Stage) {
	return findBestNameMatch(actorName, stage.getSave().lorebook?.filter(lore => lore.type === 'character') ?? [], 'title');
}

export function getActorProfile(actorId: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return '';
	}

	const lore = getLinkedActorLore(actor.name, stage);
	return lore?.content ?? actor.profile;
}

export function updateActorProfile(actorId: string, profile: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return;
	}

	const lore = getLinkedActorLore(actor.name, stage);
	if (lore) {
		lore.content = profile;
		return;
	}

	actor.profile = profile;
}

/**
 * Calculate a similarity score between two names. Higher scores indicate better matches.
 * Returns a value between 0 and 1, where 1 is a perfect match.
 * @param name The reference name
 * @param possibleName The name to compare against
 * @returns A similarity score between 0 and 1
 */
export function getNameSimilarity(name: string, possibleName: string): number {
    name = name.toLowerCase();
    possibleName = possibleName.toLowerCase();

    // Exact match gets perfect score
    if (name === possibleName) {
        return 1.0;
    }

    // Check word-based matching first (higher priority)
    const names = name.split(' ');
    
    // Count matching words
    let matchingWords = 0;
    for (const namePart of names) {
        if (possibleName.includes(namePart)) {
            matchingWords++;
        }
    }
    
    // If we have good word matches, prioritize that
    const wordMatchRatio = matchingWords / names.length;
    if (wordMatchRatio >= 0.5) {
        // Boost score for word matches, scaled by the ratio
        return 0.7 + (wordMatchRatio * 0.3);
    }

    // Use Levenshtein distance for fuzzy matching
    const matrix = Array.from({ length: name.length + 1 }, () => Array(possibleName.length + 1).fill(0));
    for (let i = 0; i <= name.length; i++) {
        for (let j = 0; j <= possibleName.length; j++) {
            if (i === 0) {
                matrix[i][j] = j;
            } else if (j === 0) {
                matrix[i][j] = i;
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + (name[i - 1] === possibleName[j - 1] ? 0 : 1)
                );
            }
        }
    }
    
    const distance = matrix[name.length][possibleName.length];
    const maxLength = Math.max(name.length, possibleName.length);
    
    // Convert distance to similarity (0 to 1)
    return Math.max(0, 1 - (distance / maxLength));
}

/**
 * Find the best matching name from a list of candidates.
 * @param searchName The name to search for
 * @param candidates An array of objects with name properties
 * @returns The best matching candidate, or null if no good match is found
 */
export function findBestNameMatch<T extends Record<K, string>, K extends string = 'name'>(
    searchName: string,
    candidates: T[],
    nameProperty: K = 'name' as K
): T | null {
    if (!searchName || candidates.length === 0) {
        return null;
    }

    let bestMatch: T | null = null;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const candidate of candidates) {
        const score = getNameSimilarity(candidate[nameProperty], searchName);
        // Only consider matches above threshold
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}