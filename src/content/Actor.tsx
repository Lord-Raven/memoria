import { v4 as generateUuid } from 'uuid';
import { Emotion, EMOTION_PROMPTS, EmotionPack } from './Emotion';
import { Stage } from '../Stage';
import { AspectRatio } from '@chub-ai/stages-ts';
import { createImageAssetUrlResolver } from './imageAssetUrl';

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

type CharacterDefinition = {
    name: string;
    fullPath: string;
    sampleImage: string;
}

// * denotes final path.
export const SUPPORTED_CHARACTERS: CharacterDefinition[] = [
    {name: 'Aeriya', fullPath: 'SilverFlame/aeriya-361950a8a9ba', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8118f416-076c-46c0-b6ec-cd162b928e21/58f1442e-3c03-4740-b138-6c100bcc20bf.png'},
    {name: 'Amat-Ea', fullPath: 'adelsvard/amat-ea-18df50a603a5', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6b8ac58-f648-4c87-8d67-3d6c63adefad/527d8308-8594-4254-b4e1-5efde4ad9cc1.png'},
    {name: 'Arca-7', fullPath: 'NobodyNos/arca-7-tactical-support-brat-4baf7876a442', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/c755a79e-2dbe-4fcb-9aa5-5bae55f11778/f7d4658a-57c2-4390-ba8f-6c8988899667.png'},
    {name: 'Astraea', fullPath: 'SteakedGamer/astraea-1e7f9aeca6e1', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/33805aff-79d6-46ab-bc2c-3eb74b859084/9b010521-17bc-4a68-93a4-38446eafba47.png'},
    {name: 'Caedmon', fullPath: 'Lellan/caedmon-the-brightwork-smith-af9d71cfe8ba', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6a6deed-e2e1-47a8-a4f6-439a6b011749/d0292798-e93f-4824-87c3-4d5205d99afa.png'},
    {name: 'Elowen', fullPath: 'Richarrd/elowen-bridgewater-f2bfac00b888', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/4a2fa754-83d7-423b-af96-1154857d6872/c7a6af54-16ed-45db-bbd0-243867d111a3.png'}, // *
    {name: 'Lumi', fullPath: 'DarkSkies/lumi-wip-a7970572de2c', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/44296727-c09e-46f4-b90e-d49a308777b8/9f020d4a-7990-46b0-ac90-27bf0f0e9939.png'},
    {name: 'Lyra', fullPath: 'Birb_Brain/lyra-ardeia-expeditioner-5f531b2f758e', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/79b9384b-5a85-4ff9-86b0-0bca7b9a01b3/6d7c9cda-f13e-451a-ac2f-ea17d21c9d83.png'},
    {name: 'Mel', fullPath: 'ashen1n/melina-mel-argyra-68a8d1c1c55a', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a02ae02e-b798-4ef5-bd6f-2f26c47593e4/16d1ad89-ae10-43c0-bc16-eaed773849ce.png'},
    {name: 'Millia', fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/b564f9af-0ffe-49fc-aefe-c9c6563688fd/4df9d97d-165c-4c90-aa1b-aa7e8787b14d.png'},
    {name: 'Milliette', fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/adb4022f-290c-44cf-b5eb-9350bbb5d5d4/2a3399c5-77ce-4e18-8087-f8d6a25b68bf.png'},
    {name: 'Mira', fullPath: 'Derpnomicon/mira-dded7def497b', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/39a4bd46-60f0-486e-9127-72470ef82c17/cd3a5df1-96c2-4621-9246-6e0145e990a3.png'},
    {name: 'Nadiya', fullPath: 'xsenn/nadiya-18576a12939e', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/612f24c2-3742-4963-8f3e-10afd2193833/1d8a6e1f-cee0-4c40-b49a-e79dba4c64cd.png'},
    {name: 'Persephone', fullPath: 'Sancay/persephone-the-normal-barmaid-774b0445ba84', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a3d2a9e2-3bbc-4814-a985-00211e64ced0/ce59e51e-08c6-499c-9845-8c0644df4c76.png'},
//    {name: 'Reitia', fullPath: '7leaf/reitia-8f2ae18ad191', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/1e5ace08-813e-40f0-b3c1-13a40ae86a01/bb78d15e-85d5-4bf6-a31e-fa8cc312d783.png'},
    {name: 'Sam', fullPath: 'Beastmastaa/the-living-scythe-sam-a97cfbc256a1', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/aad73514-fc09-4241-ac38-851d7033e253/b223f2ae-44e9-4802-a719-5b46099999c4.png'},
    {name: 'Soren', fullPath: 'Ruranel/soren-rokhe-d7bcedc04e37', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a772b885-a21f-4d65-80dd-c164e4a163e1/f342e5bb-a80c-4e20-9fdd-0753bf07d7e7.png'},
    {name: 'Thessaly', fullPath: 'Forgotten_Stories/thessaly-the-unbidden-8c09bb62bf58', sampleImage: ''},
    {name: 'Vash', fullPath: 'XxSiCxX/vash-romina-ghosts-of-another-world-735a31a4e894', sampleImage: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/f7504502-57f0-49ef-9178-b4f053c9bb37/e09c6364-4e67-4ccb-b744-c4748316335f.png'},

];

export const CASSIEL: Actor = {
    id: `cassiel`,
    name: 'Cassiel',
    type: ActorType.WARDEN,
    profile: 'A stern and enigmatic warden who oversees the prison. Cassiel is known for their strict rules and mysterious past.',
    sampleImageUrl: '',
    appearances: [{
        id: 'default',
        description: 'Cassiel, the Warden, is a towering goddess in flowing white robes.',
        name: 'Celestial Robes',
        emotionPack: {
            base: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/9989ec41-b3f4-4649-8547-697d48102f7b/28e87723-7c60-4ef8-b2b2-d433be59638a.png',//getBaseImage('cassiel/sample.png'),
        }
    }],
    appearanceId: 'default',
    fullPath: '',
    characterArc: '',
    themeColor: '#a6e683',
    themeFontFamily: 'Georgia, serif',
    voiceId: ''
};

export async function loadReserveActorFromFullPath(name: string, fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name;
    const charDef = SUPPORTED_CHARACTERS.find(char => char.fullPath === item.node.fullPath);
    console.log(item);

    const data = {
        name: name ||dataName,
        fullPath: item.node.fullPath,
        personality: item.node.definition.personality.replaceAll('{{char}}', name || dataName),
        sampleImageUrl: charDef?.sampleImage || item.node.max_res_url,
        // If the voice ID is not in the VOICE_MAP, it is a custom voice and should be preserved
        voiceId: !VOICE_MAP[item.node.definition.voice_id] ? item.node.definition.voice_id : '',
    };

    stage.generationPromises[`loading_actor/${data.fullPath}`] = loadReserveActor(data, stage).finally(() => {
        console.log('Finished loading actor for path:', data.fullPath);
        delete stage.generationPromises[`loading_actor/${data.fullPath}`];
    });

    return stage.generationPromises[`loading_actor/${data.fullPath}`];
}

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

const BASE_IMAGE_WIDTH = 880;
const BASE_IMAGE_HEIGHT = 1176;

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
    contextCanvas.width = BASE_IMAGE_WIDTH;
    contextCanvas.height = BASE_IMAGE_HEIGHT;

    const context = contextCanvas.getContext('2d');
    if (!context) {
        return imageUrl;
    }

    const scale = BASE_IMAGE_HEIGHT / image.naturalHeight;
    const scaledWidth = image.naturalWidth * scale;
    const offsetX = (BASE_IMAGE_WIDTH - scaledWidth) / 2;

    context.clearRect(0, 0, BASE_IMAGE_WIDTH, BASE_IMAGE_HEIGHT);
    context.drawImage(image, offsetX, 0, scaledWidth, BASE_IMAGE_HEIGHT);

    return contextCanvas.toDataURL('image/png');
}

export async function loadReserveActor(data: any, stage: Stage): Promise<Actor|null> {
    console.log('Loading reserve actor:', data.name);
    console.log(data);

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
    data.name = data.name.replace(/{/g, '(').replace(/}/g, ')');
    data.personality = data.personality.replace(/{/g, '(').replace(/}/g, ')');

    // Apply banned word substitutions:
    for (const [bannedWord, substitute] of Object.entries(bannedWordSubstitutes)) {
        // Need to do a case-insensitive replacement for each occurrence:
        const regex = new RegExp(bannedWord, 'gi');
        data.name = data.name.replace(regex, substitute);
        data.personality = data.personality.replace(regex, substitute);
    }

    if (Object.keys(bannedWordSubstitutes).some(word => data.personality.toLowerCase().includes(word) || data.name.toLowerCase().includes(word))) {
        console.log(`Immediately discarding actor due to banned words: ${data.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${data.name}${data.personality}`)) {
        console.log(`Immediately discarding actor due to non-english characters: ${data.name}`);
        return null;
    }

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
            `\n\nThe Original Details below describe a character of this world (${data.name}) to convert into a set of defined fields for this game. ` +
            `\n\n` +
            `Original Details about ${data.name}:\n ${data.personality}\n\n` +
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
            `COLOR: #333333\n` +
            `FONT: Calibri, sans-serif\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 400,
    });
    stage.generationPromises[`distilling_actor/${data.fullPath}`] = generationRequest.finally(() => {
            console.log('Finished generating distillation for actor:', data.name);
            delete stage.generationPromises[`distilling_actor/${data.fullPath}`];
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
    const newActor = new Actor({
        // Replace name quotation marks with single-quotes to avoid issues where nicknames are highlighted as dialogue:
        name: (parsedData['name'] || data.name).replace(/["“”]/g, "'"),
        fullPath: data.fullPath || '',
        profile: parsedData['profile'] || '',
        characterArc: parsedData['motive'] || '',
        voiceId: data.voiceId || parsedData['voice'] || '',
        themeColor: themeColor,
        font: parsedData['font'] || 'Arial, sans-serif',
        appearances: [],
        sampleImageUrl: data.sampleImageUrl || data.avatar
    });


    const defaultAppearanceName = parsedData['outfit'] || 'Default Outfit';
    const defaultAppearanceDescription = (parsedData['description'] || '');

    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, profile, or motive are missing, or banned words are present or the attributes are all defaults (unlikely to have been set at all) or description is non-english, discard this actor by returning null
    // Rewrite discard reasons to log which reason applied:
    if (!newActor.name) {
        console.log(`Discarding actor due to missing name: ${newActor.name}`);
        return null;
    } else if (!defaultAppearanceDescription) {
        console.log(`Discarding actor due to missing description: ${newActor.name}`);
        return null;
    } else if (!newActor.profile) {
        console.log(`Discarding actor due to missing profile: ${newActor.name}`);
        return null;
    } else if (!newActor.characterArc) {
        console.log(`Discarding actor due to missing motive/character arc: ${newActor.name}`);
        return null;
    } else if (Object.keys(bannedWordSubstitutes).some(word => defaultAppearanceDescription.toLowerCase().includes(word))) {
        console.log(`Discarding actor due to banned words in description: ${newActor.name}`);
        return null;
    } else if (newActor.name.length <= 2 || newActor.name.length >= 30) {
        console.log(`Discarding actor due to extreme name length: ${newActor.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newActor.name}${defaultAppearanceDescription}${newActor.profile}${newActor.characterArc}`)) {
        console.log(`Discarding actor due to non-english characters in name/description/profile/motive: ${newActor.name}`);
        return null;
    }

    // Add shell of an initial appearance
    newActor.appearances.push({
        id: generateUuid(),
        name: defaultAppearanceName,
        description: defaultAppearanceDescription,
        emotionPack: {}, // This will be filled in later when the player views this character and the emotions are generated on demand.
    });

    // Kick off emotion image:
    await generateBaseActorImage(newActor, stage, false, true, newActor.appearanceId, newActor.sampleImageUrl);
    return newActor;
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
        console.log(`Generating neutral emotion image for actor ${actor.name}`);
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
            // Need to adjust the base image to the right size/aspect ratio, then send that to the generator (880x1176).
            /*try {
                baseSourceImage = await normalizeBaseSourceImage(baseSourceImage);
            } catch (error) {
                console.warn('Failed to normalize base source image, using original source image instead.', error);
            }*/

            // Use stage.makeImageFromImage to create a base image.
            imageUrl = await stage.makeImageFromImage({
                image: await getDataUrl(baseSourceImage),
                prompt: `If needed, alter this character to match this description:\n` +
                    `${getAppearanceById(actor, targetAppearanceId).description}\n` +
                    `Disregard details below the waist. This image remains a waist-up portrait on a plain light-gray background.\n` +
                    `Preserve the messy, anime-inspired concept-art style with thick brush strokes and lustrous colors.`,
                remove_background: true,
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

export async function generateAdditionalActorImages(actor: Actor, stage: Stage, appearanceId: string = ''): Promise<void> {
    const targetAppearanceId = appearanceId || actor.appearanceId;

    console.log(`Generating additional emotion images for actor ${actor.name} (ID: ${actor.id})`);
    if (getEmotionImage(actor, 'neutral', stage, targetAppearanceId)) {
        // Generate in serial and not parallel as below:
        for (const emotion of Object.values(Emotion)) {
            // Only generate if the emotion image is missing, and only if the actor is in the save
            if (!getEmotionImage(actor, emotion, stage, targetAppearanceId) && (Object.keys(stage.getSave().actors).includes(actor.id))) {
                await generateEmotionImage(actor, emotion, stage, false, targetAppearanceId);
            }
        }
    }
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
    if (getEmotionImage(actor, 'base', stage, targetAppearanceId) && (!stage.generationPromises[`actor/${actor.id}`] || force) && (emotion == 'neutral' /*|| !stage.getSave().disableEmotionImages*/)) {
        console.log(`Generating ${emotion} emotion image for actor ${actor.name}`);
        // Create a dummy promise to prevent duplicate generation while this is in progress; this will be deleted when the generation is complete
        stage.generationPromises[`actor/${actor.id}`] = new Promise(() => {});

        const emotionPrompt = stage.getSave().emotionPrompts?.[emotion] || EMOTION_PROMPTS[emotion];

        let baseImageUrl = await getDataUrl(getEmotionImage(actor, 'base', stage, targetAppearanceId));

        const imageUrl = await stage.makeImageFromImage({
            image: baseImageUrl || '',
            prompt: `Swap the background to a contrasting flat gray. ${emotionPrompt}`,
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
export function findBestNameMatch<T extends { name: string }>(
    searchName: string,
    candidates: T[]
): T | null {
    if (!searchName || candidates.length === 0) {
        return null;
    }

    let bestMatch: T | null = null;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const candidate of candidates) {
        const score = getNameSimilarity(candidate.name, searchName);
        // Only consider matches above threshold
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}