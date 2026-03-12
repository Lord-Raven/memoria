import { v4 as generateUuid } from 'uuid';
import { Emotion, EmotionPack } from './Emotion';
import { Stage } from '../Stage';

export enum ActorType {
    PLAYER = 'PLAYER', // Primary player, controlled by the user; player is also a prisoner, but treated distinctly
    WARDEN = 'WARDEN', // Cassiel, special role that needs to be treated distinctly
    PRISONER = 'PRISONER', // Most characters

}

export class Actor {
    id: string; // UUID
    type: ActorType = ActorType.PRISONER; // Default to PRISONER
    name: string = ''; // Display name
    fullPath: string = ''; // Path to original character definition
    forkPath?: string; // If this character is a fork of another, the path to the original character definition
    avatarImageUrl: string = ''; // Original reference image
    description: string = ''; // Physical description of character
    profile: string = ''; // Obvious personality profile description of character
    motive: string = ''; // The character's agenda for being on the show or what they hope to get out of it. This could be an ulterior motive, or it could align with their profile.
    emotionPack: EmotionPack = {}; // URLs for character's emotion images
    themeColor: string = ''; // Theme color (hex code)
    themeFontFamily: string = ''; // Font family stack for CSS styling
    voiceId: string = ''; // Voice ID
    flagForBackgroundRemoval?: boolean; // Use to indicate that a character's emotionPack images should have backgrounds removed.

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
        
        this.id = generateUuid();
    }
}

export async function loadReserveActorFromFullPath(fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');
    console.log(item);

    const candidatePacks = [item.node.definition.extensions?.chub?.expressions ?? null, ...Object.values(item.node.definition.extensions?.chub?.alt_expressions ?? {})]
        .filter(pack => pack !== null && Object.values(pack.expressions).some(imageUrl => !(imageUrl as String).includes("emotions/1/")) && pack.expressions['neutral'] && !pack.expressions['neutral'].includes("emotions/1/"));
    
    let flagForBackgroundRemoval = false;
    // Check each pack asynchronously for transparency and size requirements
    const packChecks = await Promise.all(
        candidatePacks.map(async pack => {
            // Fetch an image from each emotion pack and inspect the top left pixel to see if it's transparent. If not, discard this emotion pack
            // Fetch the neutral image from the pack
            try {
                const imgResponse = await fetch(pack.expressions['neutral']);
                const imgBlob = await imgResponse.blob();
                const imgBitmap = await createImageBitmap(imgBlob);
                const canvas = document.createElement('canvas');
                canvas.width = imgBitmap.width;
                canvas.height = imgBitmap.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return false;
                ctx.drawImage(imgBitmap, 0, 0);
                const pixelData = ctx.getImageData(0, 0, 1, 1).data;
                // Check if the pixel is transparent (alpha value of 0)
                const isTransparent = pixelData[3] === 0;
                if (imgBitmap.width < 400 || imgBitmap.height < 600) {
                    console.log(`Discarding ${dataName}'s emotion pack due to small image size: ${pack.expressions['neutral']}`);
                    return false;
                } else if (!isTransparent) {
                    if (false) { //stage.saveData.removeBackgrounds) {
                        console.log(`Flagging ${dataName}'s emotion pack for background removal: ${pack.expressions['neutral']}`);
                        flagForBackgroundRemoval = true;
                        return true;
                    } else {
                        console.log(`Discarding ${dataName}'s emotion pack due to non-transparent pixels: ${pack.expressions['neutral']}`);
                        return false;
                    }
                } 
                return true;
            } catch (error) {
                // Failed to fetch avatar image.
                console.log(`Discarding actor due to failed avatar image fetch: ${dataName}`);
                return false;
            }
        })
    );
    
    const emotionPacks: EmotionPack[] = candidatePacks.filter((_, index) => packChecks[index]);

    if (emotionPacks.length === 0) {
        console.log(`Discarding actor due to missing or unsupported emotion pack: ${dataName}`);
        return null;
    }

    const data = {
        name: dataName,
        fullPath: item.node.fullPath,
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url,
        // If the voice ID is not in the VOICE_MAP, it is a custom voice and should be preserved
        voiceId: !VOICE_MAP[item.node.definition.voice_id] ? item.node.definition.voice_id : '',
        // Use the first emotionPack, but modify any entries that include "emotions/1/" to be undefined (they will default to neutral in-game).
        emotionPack: Object.fromEntries(
            Object.entries(emotionPacks[0].expressions).map(([key, value]) =>
                value.includes("emotions/1/") ? [key, undefined] : [key, value]
            )
        ),
        flagForBackgroundRemoval: flagForBackgroundRemoval,
    };
    return loadReserveActor(data, stage);
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
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}This is preparatory request for structured and formatted game content.` +
            `\n\nBackground: This game is a modern dating gameshow hosted by the literal Roman god of love, Cupid. ` +
            `The player of this game, ${stage.getPlayerActor()?.name || 'Player'}, is the primary contestant who will interview multiple candidate contestants and ultimately be matched up with one to be inexorably soul-matched by Cupid. ` +
            `The candidate contestants are generated from content pulled from other sources; they may span time periods or genres, and will require editing to repurpose for this game's setting. ` +
            `\n\nThe Original Details below describe a character or scenario (${data.name}) to convert into one of these candidate contestants. ` +
            `This request and response must digest and distill these details to suit the game's narrative scenario, ` +
            `crafting a candidate contestant who is appropriately single and ready to mingle, but in a way that respects the original source material. ` +
            `\n\n` +
            `The provided Original Details may reference 'Individual X' who was a part of their original background; ` +
            `if Individual X remains relevant to this character, Individual X should be replaced with an appropriate name in the distillation below.\n\n` +
            `Original Details about ${data.name}:\n ${data.personality}\n\n` +
            `Available Voices:\n` +
            Object.entries(VOICE_MAP).map(([voiceId, voiceDesc]) => '  - ' + voiceId + ': ' + voiceDesc).join('\n') +
            `Instructions: After carefully considering this description and the rules provided, generate a concise breakdown for a character based upon these details in the following strict format:\n` +
            `System: NAME: Their simple name\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's observable surface-level personality traits, mannerisms, and public persona. Focus on what others would notice immediately about them.\n` +
            `MOTIVE: The character's hidden agenda, underlying emotional drive, or what they truly hope to gain from being on the show. This may align with or differ from their public profile. Keep it concise but revealing of their true intentions.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender (foremost) and personality.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A font stack, or font family that reflects the character's personality; this will be embedded in a CSS font-family property.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She wears a simple, utilitarian outfit made from durable materials.\n` +
            `PROFILE: Jane is confident and determined, quick-witted, and fiercely independent. She has sharp wit and isn't afraid to speak her mind.\n` +
            `MOTIVE: Deep down, Jane is driven by a need to prove she's worthy of love despite her past betrayals. She's here looking for someone who will challenge her and see beyond her tough exterior.\n` +
            `VOICE: 03a438b7-ebfa-4f72-9061-f086d8f1fca6\n` +
            `COLOR: #333333\n` +
            `FONT: Calibri, sans-serif\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 400,
    });
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
        avatar: data.avatar || '',
        description: parsedData['description'] || '',
        profile: parsedData['profile'] || '',
        motive: parsedData['motive'] || '',
        voiceId: data.voiceId || parsedData['voice'] || '',
        themeColor: themeColor,
        font: parsedData['font'] || 'Arial, sans-serif',
        emotionPack: data.emotionPack || {},
        flagForBackgroundRemoval: data.flagForBackgroundRemoval || false,
    });
    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, profile, or motive are missing, or banned words are present or the attributes are all defaults (unlikely to have been set at all) or description is non-english, discard this actor by returning null
    // Rewrite discard reasons to log which reason applied:
    if (!newActor.name) {
        console.log(`Discarding actor due to missing name: ${newActor.name}`);
        return null;
    } else if (!newActor.description) {
        console.log(`Discarding actor due to missing description: ${newActor.name}`);
        return null;
    } else if (!newActor.profile) {
        console.log(`Discarding actor due to missing profile: ${newActor.name}`);
        return null;
    } else if (!newActor.motive) {
        console.log(`Discarding actor due to missing motive: ${newActor.name}`);
        return null;
    } else if (Object.keys(bannedWordSubstitutes).some(word => newActor.description.toLowerCase().includes(word))) {
        console.log(`Discarding actor due to banned words in description: ${newActor.name}`);
        return null;
    } else if (newActor.name.length <= 2 || newActor.name.length >= 30) {
        console.log(`Discarding actor due to extreme name length: ${newActor.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newActor.name}${newActor.description}${newActor.profile}`)) {
        console.log(`Discarding actor due to non-english characters in name/description/profile: ${newActor.name}`);
        return null;
    }

    return newActor;
}

// Remove the background from a target emotion image in actor's emotionPack using stage.generator.removeBackground.
export async function removeBackgroundFromEmotionImage(actor: Actor, emotion: Emotion, stage: Stage): Promise<void> {
    const imageUrl = actor.emotionPack[emotion];
    if (!imageUrl) return;
    try {
        const response = await stage.generator.removeBackground({image: imageUrl});
        if (!response?.url) {
            console.error(`Background removal failed for ${actor.name}'s ${emotion} emotion. Keeping original image.`);
        } else {
            console.log(`Background removed for ${actor.name}'s ${emotion} emotion. Updating emotion pack to ${response?.url}.`);
            actor.emotionPack[emotion] = response?.url ?? imageUrl;
        }
    } catch (error) {
        console.error(`Error removing background`, error);
    }
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
    const possibleNames = possibleName.split(' ');
    
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