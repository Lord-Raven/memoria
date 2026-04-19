import { v4 as generateUuid } from 'uuid';
import { Emotion, EMOTION_PROMPTS, EmotionPack, EmotionPromptMap } from './Emotion';
import { Stage } from '../Stage';
import { AspectRatio } from '@chub-ai/stages-ts';
import { createLoreEntry } from './Lore';

export enum ActorType {
    PLAYER = 'PLAYER', // Primary player, controlled by the user; player is also a prisoner, but treated distinctly
    WARDEN = 'WARDEN', // Cassiel, special role that needs to be treated distinctly
    PRISONER = 'PRISONER', // Most characters
    ITEM = 'ITEM', // Some "characters" are souls trapped in items
}

export enum ActorState {
    AVAILABLE = 'AVAILABLE', // Actor is available for interaction and can be included in skits
    FORMA = 'FORMA', // Actor is currently in a forma and unavailable for SOCIAL interactions or as an expedition partner, but they can be encountered in skits in their forma state.
    SHADE = 'SHADE', // Ill-defined at this time; unavailable for anything for now.
    RECOVERING = 'RECOVERING', // Actor is recovering from an injury or trauma; unavailable for SOCIAL or EXPEDITION interactions, but could be added mid-skit, if the narrative calls for it.
    TIMEOUT = 'TIMEOUT', // Actor has been placed in timeout by Cassiel; they are available for SOCIAL interactions, but they will not receive a bracer and are barred from EXPEDITION interactions.
}

// An outfit represents a set of clothing or physical transformation that can be applied to a specific actor; each outfit comes with a full set of emotions
export type Outfit = {
    id: string;
    name: string;
    description: string;
    prompts: EmotionPack; // This emotionPack actually contains a map of prompts rather than image URLs. The keys are the same emotion keys, but the values are prompts describing how to alter the character's expression, pose, and overall demeanor to convey that emotion while wearing this outfit. These prompts are used to guide the image generation for each emotion when a character is wearing this outfit.
    emotionPack: EmotionPack;
}

export class Actor {
    id: string = ''; // UUID
    type: ActorType = ActorType.PRISONER; // Default to PRISONER
    state: ActorState = ActorState.AVAILABLE; // Default to AVAILABLE
    name: string = ''; // Display name
    nicknames: string[] = []; // List of nicknames
    lorebookName?: string; // Name to link to lorebook entries; if empty, use display name
    fullPath: string = ''; // Path to original character definition
    sampleImageUrl: string = ''; // Original reference image
    description: string = ''; // Core physical description—not outfit-oriented
    profile: string = ''; // Personality profile description of character
    outfitId: string = ''; // The ID of the current outfit for this actor; if empty, use the first outfit index
    outfits: Outfit[] = []; // Sets of outfits representing transformations for this actor; each outfit has a full set of emotions
    themeColor: string = ''; // Theme color (hex code)
    themeFontFamily: string = ''; // Font family stack for CSS styling
    voiceId: string = ''; // Voice ID for TTS
    affinity: number = 0; // Trust/reputation with the player, clamped between 0 and 10.

    static clampAffinity(value: number | undefined | null): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(10, Math.round(value as number)));
    }

    /**
     * Rehydrate an Actor from saved data
     */
    static fromSave(savedActor: any): Actor {
        const actor = Object.create(Actor.prototype);
        Object.assign(actor, savedActor);
        actor.affinity = Actor.clampAffinity(actor.affinity);
        actor.state = savedActor.state || ActorState.AVAILABLE;
        return actor;
    }

    constructor(props: any) {
        Object.assign(this, props);
        if (!this.id) {
            this.id = generateUuid();
        }
        this.affinity = Actor.clampAffinity(this.affinity);
    }
}

export const clampActorAffinity = (value: number | undefined | null): number => Actor.clampAffinity(value);

const DISTILLATION_KEY_MAP: { [key: string]: string } = {
    name: 'name',
    description: 'description',
    profile: 'profile',
    voice: 'voice',
    color: 'color',
    font: 'font',
    outfit: 'outfit',
    'outfit name': 'outfit_name',
    'outfit description': 'outfit_description',
};

function normalizeDistillationKey(rawKey: string): string | null {
    const normalizedKey = rawKey
        .replace(/^\d+[.)-]?\s*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return DISTILLATION_KEY_MAP[normalizedKey] || null;
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

export async function loadSupportedActor(data: Partial<Actor>, stage: Stage): Promise<Actor|null> {
    // Canon data within the stage:
    const newActor = new Actor(data);

    // Retrieve data from Chub to fill in possible gaps:
    let definition: any = null;
    try {
        // If fullPath is present and contains a "/", load the character details from Chub.
        if (newActor.fullPath && newActor.fullPath.includes('/')) {
            const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', newActor.fullPath));
            definition = (await response.json()).node.definition;
        }
    } catch (error) {
        console.warn(`Failed to fetch character details for ${data.name} at path ${newActor.fullPath}:`, error);
    }

    if (definition) {
        console.log(`Loaded character definition for ${data.name} from Chub:`);
        console.log(definition);
        // Even if nothing else, use the definition voice ID over whatever is in the stage.
        if (definition.voice_id && !VOICE_MAP[definition.voice_id]) {
            newActor.voiceId = definition.voice_id;
        }

        if (definition.embedded_lorebook) {
            // Create lore entries with this character name as the category:
            const loreEntries = definition.embedded_lorebook.entries.map((entry: any) => {
                return createLoreEntry({
                    type: data.name,
                    title: entry.name,
                    content: entry.content,
                    triggers: entry.keys,
                    enabled: entry.enabled,
                    constant: entry.constant,
                    insertionOrder: entry.insertion_order,
                    priority: entry.priority,
                    probability: entry.probability
                });
            });
            stage.getSave().lorebook?.push(...loreEntries);
        }

        // if newActor is missing critical fields like personality or outfits, distill these details to fill the gaps
        if ((!newActor.profile || !newActor.outfits) && newActor.fullPath) {
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
            `DESCRIPTION: A vivid description of the character's core physical appearance: elements like gender, build, skin tone, eye color, hair color, ears, tails, or other distinguishing features.\n` +
            `OUTFIT DESCRIPTION: A detailed description of the character's current outfit, including style, colors, and any notable accessories or features.\n` +
            `OUTFIT NAME: A one- to two-word name for the character's current outfit that matches the description.\n` +
            `PROFILE: A summary of the character's personality traits, mannerisms, history, and motives.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender (foremost) and personality.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A font stack, or font family that reflects the character's personality; this will be embedded in a CSS font-family property.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She rarely smiles, but when she does, it lights up her face.\n` +
            `OUTFIT DESCRIPTION: She wears a simple, utilitarian outfit made from durable materials in dark colors. Lots of pockets and zippers.\n` +
            `OUTFIT NAME: Adventurer's Gear\n` +
            `PROFILE: Jane is confident and determined, quick-witted, and fiercely independent. Known for her sharp wit and strong presence, she has a commanding aura that draws attention. Deep down, Jane is driven by a need to prove she's worthy of love despite her past betrayals. She's here looking for someone who will challenge her and see beyond her tough exterior.\n` +
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
            const key = normalizeDistillationKey(line.substring(0, colonIndex));
            if (!key) continue;
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
    actor.description = actor.description || parsedData['description'] || '';
    actor.profile = actor.profile || parsedData['profile'] || '';
    actor.voiceId = actor.voiceId || parsedData['voice'] || '';
    actor.themeColor = actor.themeColor || themeColor;
    actor.themeFontFamily = actor.themeFontFamily || parsedData['font'] || 'Arial, sans-serif';
    actor.outfits = actor.outfits.length > 0 ? actor.outfits : [];

    if (actor.outfits.length === 0) {

        const defaultOutfitName = parsedData['outfit_name'] || parsedData['outfit'] || 'Default Outfit';
        const defaultOutfitDescription = parsedData['outfit_description'] || '';

        // Add shell of an initial outfit
        actor.outfits.push({
            id: generateUuid(),
            name: defaultOutfitName,
            description: defaultOutfitDescription,
            prompts: {},
            emotionPack: {}, // This will be filled in later when the player views this character and the emotions are generated on demand.
        });
    }

    if (actor.outfitId === '') {
        actor.outfitId = actor.outfits[0].id;
    }

    const currentOutfit = getActiveOutfit(actor);
    if (!currentOutfit.emotionPack['base']) {
        // Kick off base image generation:
        await generateBaseActorImage(actor, stage, false, true, actor.outfitId, actor.sampleImageUrl);
    } else if (!currentOutfit.emotionPack['neutral']) {
        // Kick off neutral image generation:
        await generateEmotionImage(actor, Emotion.neutral, stage, false, actor.outfitId);
    }
    return actor;
}

function getActiveOutfit(actor: Actor): Outfit {
    if (actor.outfits.length === 0) {
        // Return a default outfit if none exist to avoid errors; this will be updated with real data when the emotion images are generated.
        return {
            id: '',
            name: 'Default Outfit',
            description: '',
            prompts: {},
            emotionPack: {}
        };
    } else if (!actor.outfitId) {
        return actor.outfits[0];
    } else {
        return actor.outfits.find(outfit => outfit.id === actor.outfitId) || actor.outfits[0];
    }
}

function getOutfitById(actor: Actor, outfitId: string = ''): Outfit {
    const resolvedOutfitId = outfitId || actor.outfitId;
    return actor.outfits.find((outfit) => outfit.id === resolvedOutfitId) || getActiveOutfit(actor);
}

function getOutfitPrompt(outfit: Outfit, emotion: Emotion): string {
    return outfit.prompts?.[emotion] || '';
}

function setOutfitPrompt(outfit: Outfit, emotion: Emotion, prompt: string) {
    outfit.prompts = {
        ...(outfit.prompts || {}),
        [emotion]: prompt,
    };
}

function buildEmotionPromptGenerationInstruction(actor: Actor, outfit: Outfit, emotion: Emotion): string {

    return `{{messages}}This is a preparatory request for a single image-edit instruction for character art generation.\n\n` +
        `Character core appearance: ${actor.description}\n` +
        `Current outfit: ${outfit.description}\n` +
        `Personality and public persona: ${actor.profile}\n` +
        `Target mood: ${emotion} (${EMOTION_PROMPTS[emotion]})\n\n` +
        `Write exactly one concise prompt for an image editing model to revise a base image of this character already in this outfit. ` +
        `The prompt is intended to guide the model in adjusting an image to suit the target mood by visually describing changes to this character's expression, posture, gesture, ` +
        `and demeanor in a way that takes their style, personality, and outfit into account where appropriate. ` +
        `Only describe elements that are relevant to the target image.\n\n` +
        `Output only the final prompt text and then #END#\n\n` +
        `Example response:\n` +
        `This woman is now in a flirty, playful mood. She smiles and leans forward slightly, with a glint in her half-lidded eyes. She blushes and plays with her hair.\n#END#\n` +
        `Example response:\n` +
        `This man is now in a somber, reflective mood. He looks downcast, with slumped shoulders and a frown. His eyes look down and away, and he appears lost in thought.\n#END#\n`;
}

export async function generateOutfitEmotionPrompt(actor: Actor, emotion: Emotion, stage: Stage, outfitId: string = ''): Promise<string> {
    const outfit = getOutfitById(actor, outfitId);
    const generationKey = `actor-prompt/${actor.id}/${outfit.id}/${emotion}`;
    const existingGeneration = stage.generationPromises[generationKey];
    if (existingGeneration) {
        return existingGeneration as Promise<string>;
    }

    const promptRequest = stage.generator.textGen({
        prompt: buildEmotionPromptGenerationInstruction(actor, outfit, emotion),
        stop: ['#END'],
        include_history: true,
        max_tokens: 150,
    }).then((response: any) => {
        const generatedPrompt = response?.result?.trim() || '';
        if (generatedPrompt) {
            setOutfitPrompt(outfit, emotion, generatedPrompt);
            stage.saveGame();
        }
        return generatedPrompt;
    }).finally(() => {
        delete stage.generationPromises[generationKey];
    });

    stage.generationPromises[generationKey] = promptRequest;
    return promptRequest;
}

export function getEmotionImage(actor: Actor, emotion: Emotion | string, stage?: Stage, outfitId: string = ''): string {
    const targetOutfitId = outfitId || actor.outfitId;
    if (!actor.outfits || actor.outfits.length === 0) {
        return '';
    }
    const emotionKey = typeof emotion === 'string' ? emotion : emotion;
    const emotionPack = getOutfitById(actor, targetOutfitId).emotionPack;
    const emotionUrl = emotionPack[emotionKey];
    const neutralUrl = emotionPack['neutral'] || emotionPack['base'];
    const fallbackUrl = neutralUrl || actor.sampleImageUrl || '';

    // Check if we need to generate the image
    //if (stage && (!emotionUrl || emotionUrl === actor.sampleImageUrl || emotionUrl === emotionPack['base'] || (emotionKey !== 'neutral' && emotionUrl === neutralUrl))) {
        // Kick off generation in the background (don't wait)
        // generateEmotionImage(actor, emotion as Emotion, stage, false, targetOutfitId);
    //}

    // Return the emotion image or fallback
    return emotionUrl || fallbackUrl;
}

function setEmotionImageUrl(actor: Actor, emotion: Emotion | string, outfitId: string = '', url: string = '') {
    const targetOutfitId = outfitId || actor.outfitId;
    const emotionPack = getOutfitById(actor, targetOutfitId).emotionPack;
    emotionPack[emotion] = url;
}

export async function generateBaseActorImage(
    actor: Actor,
    stage: Stage,
    force: boolean = false,
    fromAvatar: boolean = true,
    outfitId: string = '',
    sourceImageUrl: string = ''
): Promise<void> {
    const targetOutfitId = outfitId || actor.outfitId;
    const currentBaseImageUrl = getEmotionImage(actor, 'base', stage, targetOutfitId);

    console.log(`Populating images for actor ${actor.name} (ID: ${actor.id})`);
    // If the actor has no neutral emotion image in their emotion pack, generate one based on their description or from the existing avatar image
    if (!getOutfitById(actor, targetOutfitId).emotionPack['neutral'] || force) {
        console.log(`Generating base emotion image for actor ${actor.name}`);
        // Want to clear in-progress stuff if forcing
        if (force) {
            getOutfitById(actor, targetOutfitId).emotionPack = {};
            delete stage.generationPromises[`actor/${actor.id}`];
        }
        let imageUrl = '';
        let baseSourceImage = sourceImageUrl || actor.sampleImageUrl || '';
        
        if (!baseSourceImage || !fromAvatar) {
            console.log(`Generating new image for actor ${actor.name} from description`);
            // Use stage.makeImage to create a neutral expression based on the description
            imageUrl = await stage.makeImage({
                prompt: `Illustrate this character in a rich, vibrant, anime-inspired concept-art style with thick brush strokes. ` +
                    `Core appearance: ${actor.description}\n` +
                    `Outfit: ${getOutfitById(actor, targetOutfitId).description}.\n` +
                    `Create a waist-up portrait of this character with a neutral expression and pose, placed on a light gray background.`,
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
                prompt: `If necessary, alter this character to match their physical description:\n` +
                    `${actor.description}\n` +
                    `And current outfit:\n${getOutfitById(actor, targetOutfitId).description}\n` +
                    `Swap the background to a textured gradient that garishly clashes with the character's palette.\n`,
                remove_background: false,
                transfer_type: 'edit'
            }, '');
        }
        
        console.log(`Generated base emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        setEmotionImageUrl(actor, 'base', targetOutfitId, imageUrl || '');

        if (force) {
            // Invalidate all other emotions
            getOutfitById(actor, targetOutfitId).emotionPack = {'base': getEmotionImage(actor, 'base', stage, targetOutfitId)};
        }
    }
    if (currentBaseImageUrl !== getEmotionImage(actor, 'base', stage, targetOutfitId)) {
        console.log('Done and base image has changed.');
        await generateEmotionImage(actor, Emotion.neutral, stage, false, targetOutfitId);
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

export async function generateEmotionImage(actor: Actor, emotion: Emotion, stage: Stage, force: boolean = false, outfitId: string = ''): Promise<string> {
    const targetOutfitId = outfitId || actor.outfitId;
    console.log(`Generating ${emotion} emotion image for actor ${actor.name} (ID: ${actor.id}) with outfit ID: ${targetOutfitId}`);
    if (getEmotionImage(actor, 'base', stage, targetOutfitId) && (!stage.generationPromises[`actor/${actor.id}`] || force)) {
        console.log(`Generating ${emotion} emotion image for actor ${actor.name}`);
        // Create a dummy promise to prevent duplicate generation while this is in progress; this will be deleted when the generation is complete
        stage.generationPromises[`actor/${actor.id}`] = new Promise(() => {});

        const outfit = getOutfitById(actor, targetOutfitId);
        const emotionPrompt = getOutfitPrompt(outfit, emotion) || await generateOutfitEmotionPrompt(actor, emotion, stage, targetOutfitId);
        console.log(`Using emotion prompt for ${emotion}: ${emotionPrompt}`);

        let baseImageUrl = await getDataUrl(getEmotionImage(actor, 'base', stage, targetOutfitId));

        const imageUrl = await stage.makeImageFromImage({
            image: baseImageUrl || '',
            prompt: emotionPrompt,
            remove_background: true,
            transfer_type: 'edit'
        }, '');
        delete stage.generationPromises[`actor/${actor.id}`];
        console.log(`Generated ${emotion} emotion image for actor ${actor.name}: ${imageUrl || ''}`);
        getOutfitById(actor, targetOutfitId).emotionPack[emotion] = imageUrl || '';
        return imageUrl || '';
    }
    return '';
}

export function getLinkedActorLore(actorName: string, stage: Stage) {
	return findBestNameMatch(actorName, stage.getSave().lorebook?.filter(lore => lore.type === 'character') ?? [], ['title']);
}

export function getActorLore(actorId: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return '';
	}

	const lore = getLinkedActorLore(actor.lorebookName || actor.name, stage);
	return lore?.content ?? '';
}

export function updateActorProfile(actorId: string, profile: string, stage: Stage) {
    const actor = stage.getSave().actors[actorId];
    if (!actor) {
        return;
    }

    actor.profile = profile;
}

export function updateActorLore(actorId: string, lore: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return;
	}

	const linkedLore = getLinkedActorLore(actor.lorebookName || actor.name, stage);
	if (linkedLore) {
		linkedLore.content = lore;
		return;
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
    const names = name.split(' ').filter(word => word.length > 0);
    
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
 * @param nameProperties The properties to use for comparison—default is ['name'] but could be ['name', 'nicknames'] (where nicknames is an array of strings)
 * @returns The best matching candidate, or null if no good match is found
 */
export function findBestNameMatch<T extends Record<K, string | string[]>, K extends string = 'name'>(
    searchName: string,
    candidates: T[],
    nameProperties: K[] = ['name' as K]
): T | null {
    if (!searchName || candidates.length === 0) {
        return null;
    }

    let bestMatch: T | null = null;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const candidate of candidates) {
        let score = 0;
        for (const property of nameProperties) {
            if (Array.isArray(candidate[property])) {
                for (const item of candidate[property]) {
                    if (typeof item === 'string') {
                        score = Math.max(score, getNameSimilarity(item, searchName));
                    }
                }
            } else if (typeof candidate[property] === 'string') {
                score = Math.max(score, getNameSimilarity(candidate[property], searchName as string));
            }
        }
        // Only consider matches above threshold
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}