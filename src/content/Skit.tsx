import { Emotion, EMOTION_MAPPING } from "./Emotion";
import { v4 as generateUuid } from 'uuid';
import { Outcome, OutcomeType } from "./Outcome";
import { Stage } from "../Stage";
import { Actor, findBestNameMatch, getActorLore } from "./Actor";
import { getLocationDescription } from "./Location";
import { MAX_ENTRIES } from "./Lore";

export enum SkitType {
    INTRO = 'INTRO',
    SOCIAL = 'SOCIAL',
    EXPEDITION = 'EXPEDITION',
    DISCOVERY = 'DISCOVERY',
}

export class Skit {
    id: string = '';
    skitType: SkitType = SkitType.SOCIAL;
    guidance: string = ''; // Optional guidance for the goal of this skit.
    script: ScriptEntry[] = [];
    initialActors: string[] = []; // List of Actor IDs present in this skit
    initialLocationId: string = ''; // Initial location for the skit, can be used to set background or context
    summary: string = ''; // Final summary of this skit
    over: boolean = false; // Whether this skit has concluded. This flag is set upon closing a skit.
    
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
    actorOutfits: {[key: string]: string} = {}; // Map of outfit changes by actor ID
    updatedActors?: string[]; // List of Actor IDs now in the skit as of this entry; if undefined, assume same as previous entry
    updatedLocationId?: string; // Updated location for this entry, if any; if undefined, assume same as previous entry
    outcomes: Outcome[] = []; // Optional array of outcomes or consequences resulting from this script entry; can be things like finding an item, maybe a stat or relationship change, etc.
    endScene?: boolean = false; // Optional flag to indicate if this entry ends the scene

    constructor(props: any) {
        Object.assign(this, props);
    }
}

    
// Returns the last emotion for the given actor in the skit up to the current index, or neutral if none found.
export const determineEmotion = (actorId: string, skit: Skit, index: number): Emotion => {
    let emotion = Emotion.neutral;
    for (let i = index; i >= 0; i--) {
        const line = skit.script[i];
        if (line && line.actorEmotions && line.actorEmotions[actorId]) {
            emotion = line.actorEmotions[actorId];
            break;
        }
    }
    return emotion;
}

export const determineOutfit = (actorId: string, skit: Skit, index: number): string => {
    let outfitId = '';
    for (let i = index; i >= 0; i--) {
        const line = skit.script[i];
        if (line && line.actorOutfits && line.actorOutfits[actorId]) {
            outfitId = line.actorOutfits[actorId];
            break;
        }
    }
    return outfitId;
}

export function getCurrentActors(skit: Skit, upToEntryIndex: number): string[] {
    let currentActors: string[] = [...skit.initialActors];
    for (let i = 0; i <= upToEntryIndex && i < skit.script.length; i++) {
        const entry = skit.script[i];
        if (entry.updatedActors) {
            currentActors = [...entry.updatedActors];
        }
    }
    return currentActors;
}

export function getCurrentOutfits(skit: Skit, stage: Stage, upToEntryIndex: number): {[actorId: string]: string} {

    return getCurrentActors(skit, upToEntryIndex).reduce((outfits, actorId) => {
        outfits[actorId] = determineOutfit(actorId, skit, upToEntryIndex);
        return outfits;
    }, {} as {[actorId: string]: string});
}

export function getCurrentLocation(skit: Skit, upToEntryIndex: number): string {
    let currentLocation: string = skit.initialLocationId;
    for (let i = 0; i <= upToEntryIndex && i < skit.script.length; i++) {
        const entry = skit.script[i];
        if (entry.updatedLocationId) {
            currentLocation = entry.updatedLocationId;
        }
    }
    return currentLocation;
}

function buildScriptLog(skit: Skit, additionalEntries: ScriptEntry[] = [], stage?: Stage): string {
    return ((skit.script && skit.script.length > 0) || additionalEntries.length > 0) ?
        [...skit.script, ...additionalEntries].map(e => {
            // Find the best matching emotion key for this speaker
            const emotionText = Object.entries(e.actorEmotions || {}).map(([actorId, emotion]) => {
                const actor = stage?.getSave().actors?.[actorId];
                return actor ? ` [${actor.name} expresses ${emotion}]` : '';
            }).join('');
            const wearsText = Object.entries(e.actorOutfits || {}).map(([actorId, outfitId]) => {
                const actor = stage?.getSave().actors?.[actorId];
                const outfit = actor?.outfits.find(o => o.id === outfitId);
                return actor && outfit ? ` [${actor.name} wears ${outfit.name}]` : '';
            }).join('');
            return `${stage?.getSave().actors?.[e.speakerId]?.name || e.speakerId}:${e.message}${emotionText}${wearsText}`;
        }).join('\n')
        : '(None so far)';
}

export function buildPremise(playerName: string): string {
    return `This game is a post-apocalyptic science-fantasy game in which the world is an unknowable relic of its past self. ` +
            `Ever since the end of the world—two centuries ago—the lone, overgrown city of Ardeia has stood as the final bastion of humanity. ` +
            `The population of Ardeia—referred to as 'prisoners'—have been pulled from across time, resulting in a diverse and eclectic mix of characters. ` +
            `Most have only vague memories of their past lives, ` +
            `but all have rich and detailed personalities and motives driving their existence in a new world. ` +
            `Prisoners of Ardeia serve its Warden, Cassiel, an eight-foot, angelic woman who oversees the city's operations with a mix of benevolence and authority. ` +
            `\nThe player of this game, ${playerName}, is one of these many prisoner citizens. ` +
            `This game revolves around ${playerName}'s journey through this world, as they interact with other prisoners or embark on dangerous or intriguing expeditions. ` +
            `These expeditions discover all manner of otherworldly artifacts and remnants among the mysterious, war-torn, or overgrown ruins of the old world, including relics, constructs, forma, and errata. `;
}

export function generateContext(skit: Skit|undefined, stage: Stage, historyLength: number): string {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();
    const location = skit ? save.atlas[skit.initialLocationId] : undefined;
    const pastEvents = (save.timeline ? save.timeline.slice(-historyLength) : []).filter(e => e.skit !== skit);
    const currentActors = skit ? getCurrentActors(skit, skit.script.length - 1).map(actorId => save.actors?.[actorId]).filter(actor => actor !== undefined && actor !== stage.getPlayerActor()) as Actor[] : [];
    const lorebook = save.lorebook || [];

    // For lorebook context, we go through lorebook entries and add them 
    let triggeredLore = lorebook.filter(lore => lore.enabled && (lore.constant || lore.triggers.some(trigger => {
        // If lore is of a non character/location/other type, it is owned by a parciular character; if that character isn't active right now, discard this lore entry:
        if (!['character', 'location', 'other'].includes(lore.type) && !currentActors.some(actor => actor.name.toLowerCase() === lore.type.toLowerCase())) {
            return false;
        }
        // Scan lore.scanDepth entries of the current skit for details that match this trigger
        for (let i = skit ? skit.script.length - 1 : 0; i >= Math.max(0, (skit ? skit.script.length - lore.scanDepth : 0)); i--) {
            return (skit?.script[i]?.message || '').toLowerCase().includes(trigger.toLowerCase());
        }
        return false
    }))).sort((a, b) => a.insertionOrder - b.insertionOrder);

    // Run probabilities on triggeredLore, and remove entries that don't pass. For each record, look at the entry's prorobability (100 by default) and run a calculation to determine whether to keep it in the context or not. This adds an element of variability and surprise to the lore that can be included in the context, while still prioritizing important lore with higher probability and insertion order.
    triggeredLore = triggeredLore.filter(lore => Math.random() * 100 <= lore.probability);

    // Remove (if present) lore entry for the current location (which is referenced in detail below):
    if (location) {
        const locationLoreId = findBestNameMatch(location.name, triggeredLore, 'title')?.id || '';
        triggeredLore = triggeredLore.filter(lore => lore.id !== locationLoreId);
    }
    // Remove (if present) lore entries for current actors (which are referenced in detail below):
    if (currentActors.length > 0) {
        const currentActorLoreIds = currentActors.map(actor => findBestNameMatch(actor.name, triggeredLore.filter(lore => lore.type === 'character'), 'title')?.id || '');
        triggeredLore = triggeredLore.filter(lore => !currentActorLoreIds.includes(lore.id));
    }

    // If triggeredLore has more than MAX_ENTRIES entries, we cut it down to MAX_ENTRIES based on priority (higher priority wins).
    if (triggeredLore.length > MAX_ENTRIES) {
        triggeredLore = triggeredLore.sort((a, b) => b.priority - a.priority).slice(0, MAX_ENTRIES);
    }

    // Finally, order the triggeredLore list by insertion order, so that earlier lore entries appear first in the context.
    triggeredLore = triggeredLore.sort((a, b) => a.insertionOrder - b.insertionOrder);

    const coreContext = `{{messages}}\nPremise: ${buildPremise(playerName)}\n` +
        (triggeredLore.length > 0 ?  `\n\nRelevant Information About the World:\n` + triggeredLore.map(lore => `  ${lore.title}: ${lore.content}`).join('\n') : '') +
        ((historyLength > 0 && pastEvents.length) ? 
                // Include last few skit scripts for context and style reference; use summary except for most recent skit or if no summary.
                '\n\nRecent Events for additional context:' + pastEvents.map((v, index) =>  {
                if (v.skit) {
                    const locationName = (v.skit.initialLocationId ? save.atlas[v.skit.initialLocationId]?.name : '') ?? 'Unknown Location';
                    return ((!v.skit.summary || index == pastEvents.length - 1) ?
                        (`\n\n  Script of Scene in ${locationName} (${stage.getSave().turn - v.turn}) days ago:\n` +
                        `${buildScriptLog(v.skit, [], stage)}`) :
                        (`\n\n  Summary of scene in ${locationName} (${stage.getSave().turn - v.turn}) days ago:\n` + v.skit.summary)
                        )
                } else {
                    return `\n\n  Action ${stage.getSave().turn - v.turn} days ago: ${v.description || ''}`;
                }
            }).join('') : '') +
        (location ? (`\n\nCurrent Location:\n  The following scene is set in ` +
            `${location.name || 'Unknown Location'}. ${getLocationDescription(location.id, stage) || 'No description available.'}\n`) : '') +

        `\n\nPlayer Profile for ${playerName}:\n  ${stage.getPlayerActor().profile}\n` +
        (skit && currentActors.length > 0 ? `\n\nCharacters in this Scene:\n${currentActors.map(actor => {
            const currentOutfit = actor.outfits.find(a => a.id === determineOutfit(actor.id, skit, skit.script.length - 1)) ?? actor.outfits[0];
            const otherOutfits = actor.outfits.filter(o => o.id !== currentOutfit?.id && o.emotionPack['neutral']);
            return `  ${actor.name}\n    Current Outfit (${currentOutfit.name}): ${currentOutfit.description}\n` +
                (otherOutfits.length > 0 ? `    Other Outfits: ${otherOutfits.map(o => o.name).join(', ')}\n` : '') +
                `    Profile: ${actor.profile}\n` +
                `    Lore: ${getActorLore(actor.id, stage)}`}).join('\n')}` : '');


    return coreContext;
}

export async function generateSkitScript(skit: Skit, stage: Stage): Promise<ScriptEntry[]> {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();

    if (!skit.guidance) {
        // Generate guidance for this skit based on its type and the current context, to help direct the script generation.
        console.log('Generating skit guidance...');
        let attempts = 3;
        while (attempts > 0) {
            const response = await stage.generator.textGen({
                prompt: generateContext(undefined, stage, 5) +
                    // List actors in the skit
                    `\n\nLocation:\n  ${skit.initialLocationId ? (save.atlas?.[skit.initialLocationId]?.name || 'Unknown Location') : 'Unknown Location'}\n` +
                    `\n\nCurrent Characters in the Scene:\n${skit.initialActors.map(actorId => {
                        const actor = stage.getSave().actors?.[actorId];
                        return actor ? `  ${actor.name}\n    ${actor.profile}` : '';
                    }).join('\n')}\n` +
                    `\n\nThis is a request for structured content for a game. Given the context, location, and current characters for a new upcoming scene, ` +
                    `output a short summary/goal for the scene, bearing in mind whether any other characters might make sense to add to the mix; ` +
                    `for instance, if the scene is set in a location they are known to frequent, or if a preceding scene set them up to be at this location. ` +
                    `The summary/goal will be used as guidance for the skit that ensues and can include motives, challenges, or objectives to consider; it is not user-facing content.` +
                    `\n\nExample Response:\n` +
                    `${playerName} is relaxing at the Amber Drop when Cyanea walks in. Persephone hovers nearby, pretending not to listen to their exchange, but inevitably cutting in.\n` +
                    `#END#`,
                min_tokens: 10,
                max_tokens: 150,
                include_history: true,
                stop: ['#END']
            }).catch(err => {
                console.error('Error generating skit guidance: ', err);
            });
            attempts--;
            if (response && response.result && response.result.trim().length > 0) {
                console.log('Generated skit guidance: ', response.result.trim());
                skit.guidance = response.result.trim();
                break;
            }
        }
    }

    const mainPrompt = 
            `Example Script Format:\n` +
            `  CHARACTER NAME: Character Name does some actions in prose; for example, they may be waving to you, the player. They say, "My dialogue is in quotation marks."\n` +
            `  CHARACTER NAME: [CHARACTER NAME EXPRESSES PRIDE] "A character can have two entries in a row, if they have more to say or do or it makes sense to break up a lot of activity."\n` +
            `  ANOTHER CHARACTER NAME: [ANOTHER CHARACTER NAME EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] ` +
                `"Other character expressions can update in each other's entries—say, if they're reacting to something the speaker says—, but only the named character can speak in each entry."\n` +
            `  CHARACTER NAME: They nod in agreement, "If there's any dialogue at all, the entry must be attributed to the character speaking."\n` +
            `  NARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content or other scene events occurring around you, the player, can be attributed to NARRATOR. Dialogue cannot be included in NARRATOR entries.\n` +
            `  ${stage.getPlayerActor().name.toUpperCase()}: "Hey, Character Name," I greet them warmly. I'm the player, and my entries use first-person narrative voice, while all other skit entries use second-person to refer to me.\n` +
            `\n\n` +
            (skit.script.length > 0 ? `\n\nCurrent Scene Script to Continue:\n${buildScriptLog(skit, [], stage)}` : '') +
            (skit.guidance ? `\n\nScene Prompt:\n  ${skit.guidance}` : '') +
            `\n\nPrimary Instruction:\n` +
                `  ${skit.script.length == 0 ? 'Produce the initial moments of a scene (perhaps joined in medias res)' : 'Extend or conclude the current scene script'} with three to five entries, ` +
                `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags, if warranted. ` +
                `The script should tacitly consider characters motives, relationships, and past events. ` +
                `\n\n  Follow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Characters present their own actions and dialogue, while other events within the scene are attributed to NARRATOR. ` +
                `Although a loose script format is employed, the actual content should be professionally edited narrative prose. ` +
                //(stage.getSave().disableImpersonation ? 
                //    `New entries refer to the player, ${stage.getSave().player.name}, in second-person; all other characters are referred to in third-person, even in their own entries.` :
                (    `Entries from the player, ${playerName}, are written in first-person, while other entries consistently refer to ${playerName} in second-person; all other characters are referred to in third-person, even in their own entries.`) +
                `\n\nTag Instruction:\n` +
                `  Embedded within this script, you may employ special tags to trigger various game mechanics. ` +
                `\n\n  Emotion tags ("[CHARACTER NAME expresses JOY]") should be used to indicate visible emotional shifts in a character's appearance using a single-word emotion name. ` +
                `\n\n  Outfit tags ("[CHARACTER NAME wears OUTFIT NAME]") should be used when a character changes outfit. ` +
                    `When establishing a character at the beginning of a scene or when moving to this location with a movement tag, give special consideration to the inclusion of a 'wears' tag to explicitly call out an appropriate look. ` +
                    `OUTFIT NAME must be found under the specified character—either their current outfit or one of their listed alternatives. ` +
                `\n\n  A Character movement tag ("[CHARACTER NAME moves HERE]") must be used when an Absent Character enters the scene. ` +
                `\n\n  Character movement tags ("[CHARACTER NAME moves AWAY]") must also be included when a character leaves the scene or moves to another location. ` +
                `\n\n  A Scene movement tag ("[SCENE moves LOCATION]") may be used when the scene itself transitions to another location. ` +
                `When this tag is used, all characters currently present in the scene are treated as relocating together; if anyone splits up, they will require a separate movement tag. ` +
                `\n\n  For movement tags, LOCATION should be the name of an existing location, or simply "HERE" to move to the scene's location, or "AWAY" to leave this area. ` +
                `The game engine relies upon movement tags to update character locations and visually display character presence in scenes, so it is essential to use these tags when Absent Characters enter the scene, Present Characters leave, or the scene itself relocates. ` +
                `These tags are not presented to users, so the narrative content of the script should also organically mention characters entering, exiting, or relocating. ` +
                `\n\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments or concrete details which would fundamentally alter or subvert the mechanics of the game. ` +
                (skit.script.length == 0 ? 'As this is the initial, establishing moment of a new scene, evaluate the current outfit and alternative outfits of each character and use Outfit ("wears") tags to update the characters to the most appropriate outfit for the moment. ' : '') +
                `Generally, focus upon interpersonal dynamics, character growth, and discovery or trials within this strange world. ` +
                ((save.language || 'English').toLowerCase() !== 'english' ? `\n\nNote: The game is now being played in ${save.language}. Regardless of historic language use, generate this skit content in ${save.language} accordingly. Special emotion, outfit, and movement tags continue to use English (these are invisible to the user).` : '');

    let retry = 0;
    while (retry < 3) {
        const response = await stage.generator.textGen({
                // Reduce history size with successive retries.
                prompt: `${generateContext(skit, stage, 7 - retry * 2)}\n\n${mainPrompt}`,
                min_tokens: 10,
                max_tokens: 600,
                include_history: true,
                stop: []
        });
        if (response && response.result && response.result.trim().length > 0) {
            // Strip all double asterisks; this is a temporary measure due to current model behavior.
            let text = response.result.replace(/\*\*/g, '').trim();
            let endScene = false;
            const outcomes: Outcome[] = [];
            let summary = '';
            let parsedSceneLocationId = getCurrentLocation(skit, -1);
            let parsedCurrentActors = getCurrentActors(skit, -1);
            const parsedCurrentOutfits = getCurrentOutfits(skit, stage, -1);

            // Remove any initial "System:" prefix
            if (text.toLowerCase().startsWith('system:')) {
                text = text.slice(7).trim();
            }

            // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
            const lines = text.split('\n');
            const combinedLines: string[] = [];
            const combinedTagData: {emotions: {[key: string]: Emotion}, outfitChanges: {[actorId: string]: string}, updatedActors?: string[], updatedLocationId?: string}[] = [];
            let currentLine = '';
            let currentEmotionTags: {[key: string]: Emotion} = {};
            let currentOutfitChanges: {[actorId: string]: string} = {};
            let currentUpdatedActors: string[] | undefined;
            let currentUpdatedLocationId: string | undefined;

            for (const line of lines) {
                // Skip empty lines
                let trimmed = line.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, '\'');

                console.log(`Process line: ${trimmed}`);

                // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                const newEmotionTags: {[key: string]: Emotion} = {};
                const newOutfitChanges: {[actorId: string]: string} = {};
                let newUpdatedActors: string[] | undefined;
                let newUpdatedLocationId: string | undefined;

                // Prepare list of all actors (not just present)
                const allActors: Actor[] = Object.values(stage.getSave().actors);
                const allLocations = Object.values(stage.getSave().atlas || {});

                const resolveLocationId = (locationNameOrId: string): string | undefined => {
                    const locationText = locationNameOrId.trim();
                    if (!locationText) return undefined;

                    if (stage.getSave().atlas?.[locationText]) {
                        return locationText;
                    }

                    const matchedLocation = findBestNameMatch(locationText, allLocations);
                    return matchedLocation?.id;
                };
                
                // Process tags in the line
                for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                    const raw = tag.slice(1, -1).trim();
                    if (!raw) continue;

                    console.log(`Processing tag: ${raw}`);

                    // Handle movement tags (character and scene):
                    const movementTagRegex = /([^[\]]+)\s+moves\s+([^[\]]+)/i;
                    const movementMatch = movementTagRegex.exec(raw);
                    if (movementMatch) {
                        const moverName = movementMatch[1].trim();
                        const destinationText = movementMatch[2].trim();
                        const destinationUpper = destinationText.toUpperCase();

                        if (moverName.toUpperCase() === 'SCENE') {
                            if (destinationUpper !== 'AWAY') {
                                const resolvedSceneLocationId = destinationUpper === 'HERE'
                                    ? parsedSceneLocationId
                                    : resolveLocationId(destinationText);
                                if (resolvedSceneLocationId) {
                                    parsedSceneLocationId = resolvedSceneLocationId;
                                    newUpdatedLocationId = resolvedSceneLocationId;
                                }
                            }
                            continue;
                        }

                        const matchedActor = findBestNameMatch(moverName, allActors);
                        if (!matchedActor) continue;

                        const isMoveToCurrentScene = destinationUpper === 'HERE' ||
                            (destinationUpper !== 'AWAY' && !!parsedSceneLocationId && resolveLocationId(destinationText) === parsedSceneLocationId);

                        if (isMoveToCurrentScene) {
                            if (!parsedCurrentActors.includes(matchedActor.id)) {
                                parsedCurrentActors = [...parsedCurrentActors, matchedActor.id];
                            }
                        } else {
                            parsedCurrentActors = parsedCurrentActors.filter(actorId => actorId !== matchedActor.id);
                        }

                        newUpdatedActors = [...parsedCurrentActors];
                        continue;
                    }


                    // Handle outfit tags:
                    const outfitTagRegex = /([^[\]]+)\s+wears\s+([^[\]]+)/gi;
                    let outfitMatch = outfitTagRegex.exec(raw);
                    if (outfitMatch) {
                        const characterName = outfitMatch[1].trim();
                        const outfitName = outfitMatch[2].trim();
                        // Find matching actor using findBestNameMatch
                        const matched = findBestNameMatch(characterName, allActors);
                        if (!matched) continue;

                        // Find matching outfit for this actor
                        const matchedOutfit = findBestNameMatch(outfitName, matched.outfits || []);
                        if (!matchedOutfit) {
                            console.warn(`Outfit "${outfitName}" not found for ${matched.name}; skipping tag.`);
                            continue;
                        }

                        newOutfitChanges[matched.id] = matchedOutfit.id;
                        console.log(`Outfit tag: ${matched.name} wears ${matchedOutfit.name}`);
                    }
                    
                    // Look for expresses tags:
                    const emotionTagRegex = /([^[\]]+)\s+expresses\s+([^[\]]+)/gi;
                    let emotionMatch = emotionTagRegex.exec(raw);
                    if (emotionMatch) {
                        const characterName = emotionMatch[1].trim();
                        const emotionName = emotionMatch[2].trim().toLowerCase();
                        // Find matching actor using findBestNameMatch
                        const matched = findBestNameMatch(characterName, allActors);
                        if (!matched) continue;

                        // Try to map emotion using EMOTION_SYNONYMS if not a standard emotion
                        let finalEmotion: Emotion | undefined;
                        if (emotionName in Emotion) {
                            finalEmotion = emotionName as Emotion;
                            console.log(`Recognized standard emotion "${finalEmotion}" for ${matched.name}`);
                        } else {
                            const closestEmotion = findBestNameMatch(emotionName, Object.keys(EMOTION_MAPPING).map(e => ({ name: e })));
                            if (closestEmotion) {
                                console.log(`Emotion "${emotionName}" for ${matched.name} mapped to emotion "${EMOTION_MAPPING[closestEmotion.name]}".`);
                                finalEmotion = EMOTION_MAPPING[closestEmotion.name];
                            } else {
                                console.warn(`Unrecognized emotion "${emotionName}" for ${matched.name} and no close match found; skipping tag.`);
                            }
                        }
                        
                        if (!finalEmotion) continue;
                        newEmotionTags[matched.id] = finalEmotion;
                    }
                }

                // Remove all tags before processing for display:
                trimmed = trimmed.replace(/\[([^\]]+)\]/g, '').trim();

                if (line.includes(':')) {
                    // New line
                    if (currentLine) {
                        combinedLines.push(currentLine.trim());
                        combinedTagData.push({
                            emotions: currentEmotionTags,
                            outfitChanges: currentOutfitChanges,
                            updatedActors: currentUpdatedActors,
                            updatedLocationId: currentUpdatedLocationId
                        });
                    }
                    currentLine = trimmed;
                    currentEmotionTags = newEmotionTags;
                    currentOutfitChanges = newOutfitChanges;
                    currentUpdatedActors = newUpdatedActors;
                    currentUpdatedLocationId = newUpdatedLocationId;
                } else {
                    // Continuation of previous line
                    currentLine += '\n' + trimmed;
                    currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                    currentOutfitChanges = {...currentOutfitChanges, ...newOutfitChanges};
                    currentUpdatedActors = newUpdatedActors || currentUpdatedActors;
                    currentUpdatedLocationId = newUpdatedLocationId || currentUpdatedLocationId;
                }
            }
            if (currentLine) {
                combinedLines.push(currentLine.trim());
                combinedTagData.push({
                    emotions: currentEmotionTags,
                    outfitChanges: currentOutfitChanges,
                    updatedActors: currentUpdatedActors,
                    updatedLocationId: currentUpdatedLocationId
                });
            }

            // Convert combined lines into ScriptEntry objects by splitting at first ':'
            const scriptEntries: ScriptEntry[] = combinedLines.map((l, index) => {
                const idx = l.indexOf(':');
                let speakerId = '';
                let message = l;
                
                if (idx !== -1) {
                    const speakerName = l.slice(0, idx).trim();
                    // Find matching actor using findBestNameMatch
                    const matched = findBestNameMatch(speakerName, save.actors ? Object.values(save.actors) : []);
                    console.log(`Processing speaker: "${speakerName}" - Matched Actor: ${matched ? matched.name : 'None'}`);
                    speakerId = matched ? matched.id : ''; // Use actor ID if found, otherwise empty for narrator.
                    message = l.slice(idx + 1).trim();
                }
                
                // Remove any remaining tags
                message = message.replace(/\[([^\]]+)\]/g, '').trim();
                
                const entry: ScriptEntry = { speakerId: speakerId, message, speechUrl: '', actorEmotions: {}, actorOutfits: {}, outcomes: [] };
                const tagData = combinedTagData[index];
                
                if (tagData.emotions && Object.keys(tagData.emotions).length > 0) {
                    entry.actorEmotions = tagData.emotions;
                }
                if (tagData.updatedActors) {
                    entry.updatedActors = [...tagData.updatedActors];
                }
                if (tagData.outfitChanges && Object.keys(tagData.outfitChanges).length > 0) {
                    entry.actorOutfits = tagData.outfitChanges;
                }
                if (tagData.updatedLocationId) {
                    entry.updatedLocationId = tagData.updatedLocationId;
                }
                
                return entry;
            });

            // Drop empty entries from scriptEntries and adjust speaker to any matching actor's name:
            for (const entry of scriptEntries) {
                if (!entry.message || entry.message.trim().length === 0) {
                    const updatedActors = entry.updatedActors;
                    const emotions = entry.actorEmotions || {};
                    const outfitChanges = entry.actorOutfits || {};
                    const nextEntry = scriptEntries[scriptEntries.indexOf(entry) + 1];
                    if (nextEntry) {
                        if (updatedActors) {
                            nextEntry.updatedActors = [...updatedActors];
                        }
                        nextEntry.actorEmotions = {...(nextEntry.actorEmotions || {}), ...emotions};
                        nextEntry.actorOutfits = {...(nextEntry.actorOutfits || {}), ...outfitChanges};
                    }
                    scriptEntries.splice(scriptEntries.indexOf(entry), 1);
                    continue;
                }
            }
        

            // TTS for each entry's dialogue
            const ttsPromises = scriptEntries.map(async (entry) => {
                const actor = entry.speakerId ? save.actors[entry.speakerId] : null;
                // Only TTS if entry.speaker matches an actor from stage().getSave().actors and entry.message includes dialogue in quotes.
                if (!actor || !entry.message.includes('"') || !save.textToSpeech) {
                    console.log(`Skipping TTS: ${!actor ? "No matching actor" : (!entry.message.includes('"') ? "No dialogue in quotes" : "Text-to-speech disabled")}.`);
                    entry.speechUrl = '';
                    return;
                }
                let transcript = entry.message.split('"').filter((_, i) => i % 2 === 1).join('.........').trim();
                // Strip asterisks or other markdown-like emphasis characters
                transcript = transcript.replace(/[\*_~`]+/g, '');
                try {
                    const ttsResponse = await stage.generator.speak({
                        transcript: transcript,
                        voice_id: actor.voiceId ?? undefined
                    });
                    if (ttsResponse && ttsResponse.url) {
                        entry.speechUrl = ttsResponse.url;
                    } else {
                        entry.speechUrl = '';
                    }
                } catch (err) {
                    console.error('Error generating TTS:', err);
                    entry.speechUrl = '';
                }
            });

            // If this response contains an endScene, we will analyze the script for stat changes or other game mechanics to be applied. Add this to the ttsPromises to run in parallel.
            console.log('Perform additional analysis.');
            ttsPromises.push((async () => {
                const endPrompt = generateContext(skit, stage, 0) +
                    `\n\nScene Script for Analysis:\n${buildScriptLog(skit, scriptEntries, stage)}` +
                    `\n\nInstruction:\nAnalyze the preceding scene script and determine whether the final moments make for a suitable ending to the scene. ` +
                    `If the scene feels complete or has reached a good suspended moment, output "[END SCENE]" followed by a "[SUMMARY: ...]" tag with a brief summary of the entire scene's key events or outcomes. ` +
                    `If the scene does not feel complete, output "[CONTINUE SCENE]" and "[SUMMARY: ...]" tag with a brief explanation of what is missing or what could be developed further to reach a satisfying conclusion. ` +
                    `\n\nIf the scene is complete, utilize additional tags to highlight any significant developments, such as character relationship changes or lore entries above that require updates as a result of this scene. ` +
                    `\n\n#Relationship Changes:#\n` +
                    `Indicate affection changes between the player and any characters involved in the scene; affection is represented as a number between 1 and 10, so increments should be small.\n` +
                    `[AFFECTION CHANGE: Character Name +/-x]` +
                    `\nExamples:\n[AFFECTION CHANGE: Cyanea +1]\n[AFFECTION CHANGE: Lyra -1]` +
                    `\n\n#Lore Updates:#\n` +
                    `Indicate the names of lore entries that may need to be updated as a result of the skit. Actual updates will be made in separate requests; this tag merely flags an entry for update.\n` +
                    `[LORE UPDATE: Lore Entry Name]` +
                    `\nExample:\n[LORE UPDATE: Cassiel]\n[LORE UPDATE: The Gardens]` +
                    `\n\nThe primary goal is to determine the completion of the scene and provide a summary, but include additional tags when appropriate.` +
                    `\nExample Response:\n` +
                    `[END SCENE]\n[SUMMARY: This expedition took ${playerName} and Cyanea to the Shells, where they encountered Red Hood and uncovered a new threat: the Coral Razor.]` +
                    `\n[AFFECTION CHANGE: Cyanea +1]\n[AFFECTION CHANGE: Red Hood -1]\n[LORE UPDATE: The Shells]\n[LORE UPDATE: Cyanea]\n[LORE UPDATE: Red Hood]\n` +
                    `#END#` +
                    `\nExample Response:\n` +
                    `[CONTINUE SCENE]\n[SUMMARY: The scene is developing well, but it would be more satisfying with a clearer moment of resolution at the end. Consider whether ${playerName} could discover a new clue or have a significant interaction with another character to create a more compelling ending.]\n` +
                    `#END#` +
                    ``;
                
                const endResponse = await stage.generator.textGen({
                    prompt: endPrompt,
                    min_tokens: 1,
                    max_tokens: 500,
                    include_history: true,
                    stop: ['#END']
                });

                if (endResponse && endResponse.result) {
                    // Strip double-asterisks. TODO: Remove this once other model issue is resolved.
                    text = text.replace(/\*\*/g, '');

                    if (endResponse.result.includes('[END SCENE]')) {
                        endScene = true;
                        const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(endResponse.result);
                        summary = summaryMatch ? summaryMatch[1].trim() : '';
                        console.log('Model determined scene should end. Summary:', summary);

                        const affectionChangeRegex = /\[AFFECTION CHANGE:\s*([^\]]+?)\s*([+-]\d+)\]/gi;
                        let match;
                        while ((match = affectionChangeRegex.exec(endResponse.result)) !== null) {
                            const characterName = match[1].trim();
                            const changeValue = parseInt(match[2]);
                            const matchedActor = findBestNameMatch(characterName, Object.values(save.actors));
                            if (matchedActor && !isNaN(changeValue)) {
                                console.log(`Affection change flagged for ${matchedActor.name}: ${changeValue > 0 ? '+' : ''}${changeValue}`);
                                outcomes.push(new Outcome({
                                    type: OutcomeType.RELATIONSHIP_CHANGE,
                                    description: `Affection with ${matchedActor.name} changes by ${changeValue > 0 ? '+' : ''}${changeValue}.`,
                                    details: {
                                        actorId: matchedActor.id,
                                        actorName: matchedActor.name,
                                        changeValue,
                                    },
                                }));
                            }
                        }

                        const loreUpdateRegex = /\[LORE UPDATE:\s*([^\]]+)\]/gi;
                        while ((match = loreUpdateRegex.exec(endResponse.result)) !== null) {
                            const loreName = match[1].trim();
                            const matchedLore = findBestNameMatch(loreName, save.lorebook || [], 'title');
                            if (matchedLore) {
                                console.log(`Lore update flagged for "${matchedLore.title}".`);
                                outcomes.push(new Outcome({
                                    type: OutcomeType.LORE_UPDATE,
                                    description: `Lore entry \"${matchedLore.title}\" should be reviewed for updates.`,
                                    details: {
                                        loreId: matchedLore.id,
                                        loreTitle: matchedLore.title,
                                    },
                                }));
                            }
                        }

                    }
                }
            })());

            // Wait for all TTS generation to complete
            await Promise.all(ttsPromises);

            // Attach endScene and endProperties to the final entry if the scene ended
            if (endScene && scriptEntries.length > 0) {
                console.log('Updating final entry');
                const finalEntry = scriptEntries[scriptEntries.length - 1];
                finalEntry.endScene = true;
                finalEntry.outcomes = outcomes;
                console.log(finalEntry.outcomes);
            }

            if (endScene && !summary) {
                console.log('Scene ended without a summary.');
            }
            skit.summary = summary;

            stage.pushMessage(text);

            return scriptEntries;
        } else {
            retry++;
        }
    }

    return [];


}

