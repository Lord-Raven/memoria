import { Emotion, EMOTION_MAPPING } from "./Emotion";
import { v4 as generateUuid } from 'uuid';
import { Outcome, OutcomeType } from "./Outcome";
import { Stage } from "../Stage";
import { Actor, ActorType, findBestNameMatch, getActorLore } from "./Actor";
import { getLocationDescription } from "./Location";
import { MAX_ENTRIES } from "./Lore";
import {buildPrompt, PromptBuilder} from "../utils/PromptBuilder.js";

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
    currentIndex: number = 0;
    
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
            return `${stage?.getSave().actors?.[e.speakerId]?.name.toUpperCase() || e.speakerId}:${e.message}${emotionText}${wearsText}`;
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

export function generateContext(skit: Skit|undefined, stage: Stage, historyLength: number): ((b: PromptBuilder) => any) {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();
    const location = skit ? save.atlas[skit.initialLocationId] : undefined;
    const pastEvents = (save.timeline ? save.timeline.slice(-historyLength) : []).filter(e => e.skit !== skit);
    const currentActors = skit ? getCurrentActors(skit, skit.script.length - 1).map(actorId => save.actors?.[actorId]).filter(actor => actor !== undefined && actor !== stage.getPlayerActor()) as Actor[] : [];
    const lorebook = save.lorebook || [];

    // For lorebook context, we go through lorebook entries and add them 
    let triggeredLore = lorebook.filter(lore => {
            if (!lore.enabled || (!['character', 'location', 'other'].includes(lore.type) && !currentActors.some(actor => actor.name.toLowerCase() === lore.type.toLowerCase()))) {
                return false;
            }

            if (lore.type === 'character' && currentActors.some(actor => actor.name.toLowerCase() === lore.title.toLowerCase())) {
                return false; // Skip inclusion of lore entries for characters currently present in the scene, as they are included in that character's content.
            }

            if (lore.constant) {
                return true;
            }

            return lore.triggers.some(trigger => {
                    // Scan lore.scanDepth entries of the current skit for details that match this trigger
                    for (let i = skit ? skit.script.length - 1 : 0; i >= Math.max(0, (skit ? skit.script.length - lore.scanDepth : 0)); i--) {
                        if((skit?.script[i]?.message || '').toLowerCase().includes(trigger.toLowerCase())) {
                            return true;
                        }
                    }
                    return false;
            });
    }).sort((a, b) => a.insertionOrder - b.insertionOrder);

    // Run probabilities on triggeredLore, and remove entries that don't pass. For each record, look at the entry's prorobability (100 by default) and run a calculation to determine whether to keep it in the context or not. This adds an element of variability and surprise to the lore that can be included in the context, while still prioritizing important lore with higher probability and insertion order.
    triggeredLore = triggeredLore.filter(lore => Math.random() * 100 <= lore.probability);

    // Remove (if present) lore entry for the current location (which is referenced in detail below):
    if (location) {
        const locationLoreId = findBestNameMatch(location.name, triggeredLore, ['title'])?.id || '';
        triggeredLore = triggeredLore.filter(lore => lore.id !== locationLoreId);
    }
    // Remove (if present) lore entries for current actors (which are referenced in detail below):
    if (currentActors.length > 0) {
        const currentActorLoreIds = currentActors.map(actor => findBestNameMatch(actor.name, triggeredLore.filter(lore => lore.type === 'character'), ['title'])?.id || '');
        triggeredLore = triggeredLore.filter(lore => !currentActorLoreIds.includes(lore.id));
    }

    // If triggeredLore has more than MAX_ENTRIES entries, we cut it down to MAX_ENTRIES based on priority (higher priority wins).
    if (triggeredLore.length > MAX_ENTRIES) {
        triggeredLore = triggeredLore.sort((a, b) => b.priority - a.priority).slice(0, MAX_ENTRIES);
    }

    // Finally, order the triggeredLore list by insertion order, so that earlier lore entries appear first in the context.
    triggeredLore = triggeredLore.sort((a, b) => a.insertionOrder - b.insertionOrder);

    return (builder: PromptBuilder) => builder.addBlock(`Premise`, buildPremise(playerName))
        .addBlock(`Lore Entries`, (builder) => {
            // Add each lore entry as a separate block, with the title and content.
            triggeredLore.forEach(lore => {
                builder.addBlock(`${lore.type}_${lore.title}`, lore.content);
            });
        }).addBlock(`Recent Events`, (builder) => {
            pastEvents.forEach((event, index) => {
                if (event.skit) {
                    const locationName = (event.skit.initialLocationId ? save.atlas[event.skit.initialLocationId]?.name : '') ?? 'Unknown Location';
                    builder.addBlock(`Event_${index + 1}`, `Scene in ${locationName} (${stage.getSave().turn - event.turn}) days ago:\n` +
                        (event.skit.summary ? `Summary: ${event.skit.summary}` : `Script:\n${buildScriptLog(event.skit, [], stage)}`));
                }
            });
        }).addBlock(`Current Location`, `The following scene is set in ` +
            `${location?.name || 'Unknown Location'}. ${getLocationDescription(location?.id || '', stage) || 'No description available.'}`
        ).addBlock(`Player Profile`,
            `${playerName}:\n  ${stage.getPlayerActor().profile}`
        ).addBlock(`Characters Present`, (builder) => {
            if (skit) {
                currentActors.forEach(actor => {
                    const currentOutfit = actor.outfits.find(a => a.id === determineOutfit(actor.id, skit, skit.script.length - 1)) ?? actor.outfits[0];
                    const otherOutfits = actor.outfits.filter(o => o.id !== currentOutfit?.id && o.emotionPack['neutral']);
                    builder.addBlock(`${actor.name}`, `  Current Outfit (${currentOutfit.name}): ${currentOutfit.description}\n` +
                        (otherOutfits.length > 0 ? `  Other Outfits: ${otherOutfits.map(o => o.name).join(', ')}\n` : '') +
                        `  Profile: ${actor.profile}\n` +
                        `  Lore: ${getActorLore(actor.id, stage)}` +
                        `  Affinity: ${getAffinityPrompt(actor.affinity, playerName)}`
                    );
                })
            }
        });
}

// Affinity is a score between 0 and 10.
function getAffinityPrompt(affinity: number, playerName: string): string {
    if (affinity >= 9) {
        return `They are extremely close to ${playerName}, expressing deep care, affection, and absolute faith in them.`;
    } else if (affinity >=7) {
        return `They are very fond of ${playerName}, showing strong care, affection, and trust for them.`;
    } else if (affinity >= 5) {
        return `They are fond of ${playerName}, demonstrating care, affection, and trust, with occasional reservations.`;
    } else if (affinity >= 2) {
        return `They have a neutral relationship with ${playerName}, demonstrating some tentative care and trust, despite concerns.`;
    } else {
        return `They barely know ${playerName}, uncertain of their intentions.`;
    }
}

export async function generateSkitScript(skit: Skit, stage: Stage): Promise<ScriptEntry[]> {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();

    if (!skit.guidance) {
        // Generate guidance and initial actors for this skit based on its type and the current context
        console.log('Generating skit guidance...');
        let attempts = 3;
        const availableActors = Object.values(stage.getSave().actors)
            .filter(actor => actor.type !== ActorType.PLAYER && !(stage.getSave().expeditionChoices || []).some(choice => choice.partnerActorIds.includes(actor.id)));
        while (attempts > 0) {
            const response = await stage.generateText(
                buildPrompt()
                    .addBlock(`Instructions`,
                        `This is a request for structured content for a game. Given the context and location, ` +
                        `use the format below to output guidance for the upcoming scene: plot goals, challenges, slice-of-life vignettes, or intimate moments. ` +
                        `Then, name the characters from the Available Characters list that will participate.`)
                    .addBlock('Location',
                        `  ${skit.initialLocationId ? (save.atlas?.[skit.initialLocationId]?.name || 'Unknown Location') : 'Unknown Location'}\n` +
                        `    ${getLocationDescription(skit.initialLocationId, stage) || 'No description available.'}`)
                    .addBlock('Available Characters',
                        skit.initialActors.map(actorId => {
                            const actor = stage.getSave().actors?.[actorId];
                            return actor ? `  ${actor.name}\n    ${getActorLore(actor.id, stage)}` : '';
                        }))
                    .addBlock('Example Response',
                        `GUIDANCE: ${playerName} is relaxing at the Amber Drop when Cyanea walks in. Persephone hovers nearby, pretending not to listen to their exchange, but inevitably cutting in when things take an unexpected turn.\n` +
                        `PARTICIPANTS: Cyanea, Persephone\n` +
                        `#END#`)
                    .addBlock('Additional Context',
                        generateContext(skit, stage, 5))
                    .format(),
                10, 400
            ).catch(err => {
                console.error('Error generating skit guidance: ', err);
            });
            attempts--;
            if (response && response.trim().length > 0) {
                console.log('Generated skit guidance: ', response.trim());
                // Need to read GUIDANCE: and PARTICIPANTS:
                const guidanceMatch = /GUIDANCE:\s*(.+)/i.exec(response);
                const participantsMatch = /PARTICIPANTS:\s*(.+)/i.exec(response);
                if (guidanceMatch && participantsMatch) {
                    skit.guidance = guidanceMatch[1].trim();
                    skit.initialActors = participantsMatch[1].split(',').map(name => findBestNameMatch(name.trim(), availableActors, ['name', 'nicknames'])?.id).filter(id => id !== undefined) as string[];
                    break;
                }
            }
        }
    }

    let retry = 0;
    while (retry < 3) {

        const prompt =
            buildPrompt()
                .addBlock(`Instructions`,
                    `${skit.script.length == 0 ? 'Produce the initial moments of a scene (perhaps joined in medias res)' : 'Extend or conclude the current scene script'} with three to five entries, ` +
                    `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags, if warranted. ` +
                    `The script should tacitly consider characters motives, relationships, and past events. ` +
                    `\n\nFollow the structure of the strict Example Script formatting; ` +
                    `actions are depicted in prose and character dialogue in quotation marks. ` +
                    `Characters present their own actions and dialogue, while other events within the scene are attributed to NARRATOR. ` +
                    `Although a script format is employed, the actual content should be professionally edited narrative prose. ` +
                    (save.disableImpersonation ?
                        `New entries refer to the player, ${playerName}, in second-person; all other characters are referred to in third-person, even in their own entries.` :
                        (`Entries from the player, ${playerName}, are written in first-person, while other entries consistently refer to ${playerName} in second-person; all other characters are referred to in third-person, even in their own entries.`)) +
                    `This scene is a brief visual novel skit within a video game; as such, the scene avoids major developments or concrete details which would fundamentally alter or subvert the mechanics of the game. ` +
                    (skit.script.length == 0 ? 'As this is the initial, establishing moment of a new scene, evaluate the current outfit and alternative outfits of each character and use Outfit ("wears") tags to update the characters to the most appropriate outfit for the moment. Begin the scene with appropriate tags at the "System:" prompt.' : 'Continue the scene at the "System:" prompt.') +
                    `Generally, focus upon interpersonal dynamics, character growth, and discovery or trials within this strange world.` +
                    ((save.language || 'English').toLowerCase() !== 'english' ? `\n\nNote: The game is now being played in ${save.language}. Regardless of historic language use, generate this skit content in ${save.language} accordingly. Special emotion, outfit, and movement tags continue to use English (these are invisible to the user).` : '')
                )
                .addBlock('Script Format',
                    `SPEAKER NAME: [Appropriate Tags] Prose with "embedded dialogue" and actions.`)
                .addBlock('Tags', (builder) =>
                    builder.addBlock('Tag Instruction',
                        `Embedded within this script, you may employ special tags to trigger various game mechanics. These tags are not presented to users, so the narrative content of the script should also organically mention characters entering, exiting, or relocating. Character names in tags or in the script are ALL CAPS.`)
                        .addBlock('Emotion Tags',
                        `Emotion tags ("[CHARACTER NAME expresses JOY]") should be used to indicate visible emotional shifts in a character's appearance using a single-word emotion name.`)
                        .addBlock('Outfit Tags',
                        `Outfit tags ("[CHARACTER NAME wears OUTFIT NAME]") should be used when a character changes outfit. ` +
                            `When establishing a character at the beginning of a scene or when moving to this location with a movement tag, give special consideration to the inclusion of a 'wears' tag to explicitly call out an appropriate look. ` +
                            `OUTFIT NAME must be found under the specified character—either their current outfit or one of their listed alternatives.`)
                        .addBlock('Movement Tags',
                    `\n\nA Character movement tag ("[CHARACTER NAME moves HERE]") must be used when an Absent Character engages in the scene (even if they are already narratively present). ` +
                            `\n\nCharacter movement tags ("[CHARACTER NAME moves AWAY]") must also be included when a character leaves the scene or moves to another location. ` +
                            `\n\nA Scene movement tag ("[SCENE moves LOCATION]") may be used when the scene itself transitions to another location. ` +
                            `When this tag is used, all characters currently present in the scene are treated as relocating together; if anyone splits up, they will require a separate movement tag. ` +
                            `\n\nFor movement tags, LOCATION should be the name of an existing location, or simply "HERE" to move to the scene's location, or "AWAY" to leave this area. ` +
                            `The game engine relies upon movement tags to update character locations and visually display character presence in scenes, so it is essential to use these tags when Absent Characters enter the scene, Present Characters leave, or the scene itself relocates.`)
                ).addBlock('Example Script',
                    `NARRATOR: The sun sets over the horizon, casting a warm glow across the abandoned city. The air is thick with anticipation as the group gathers in the central plaza.\n` +
                    `CYANEA: "I can't believe we're finally here. It's been a long journey."\n` +
                    `PERSEPHONE: "Yes, but the real challenge is just beginning. We must stay vigilant." Persephone gently chides Cyanea.\n` +
                    `CYANEA: [CYANEA expresses DETERMINATION] Cyanea frowns uncharacteristically with determination, "Of course." She nods with almost comical sobriety.\n` +
                    (!save.disableImpersonation ? `${playerName.toUpperCase()}: I smile warmly at the two women, "I agree. We need to be careful and work together."\n` : '') +
                    `RED HOOD: [RED HOOD moves to HERE] A crimson-clad figure approaches with supplies."\n`
                )
                .addBlock('Scene Prompt',
                    `Scene Prompt: ${skit.guidance}`)
                .addBlock('Context',
                    generateContext(skit, stage, 7 - retry * 2))
                .format();
        console.log(prompt);
        const response = await stage.generateText(prompt, 10, 600)

        if (response && response.trim().length > 0) {
            // Strip all double asterisks; this is a temporary measure due to current model behavior.
            let text = response.replace(/\*\*/g, '').trim();
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

            // Parse response based on format "ALL CAPS NAME: content"; content could be multi-line.
            // This avoids treating narrative colons as speaker delimiters.
            const speakerLineRegex = /^([A-Z][A-Z0-9 '&.-]*):\s*(.*)$/s;
            const lines = text.split('\n');
            const combinedLines: string[] = [];
            const combinedTagData: {emotions: {[key: string]: Emotion}, outfitChanges: {[actorId: string]: string}, updatedActors?: string[], updatedLocationId?: string}[] = [];
            let currentLine = '';
            let currentEmotionTags: {[key: string]: Emotion} = {};
            let currentOutfitChanges: {[actorId: string]: string} = {};
            let currentUpdatedActors: string[] | undefined;
            let currentUpdatedLocationId: string | undefined;

            // Prepare list of all actors (not just present)
            const allActors: Actor[] = Object.values(stage.getSave().actors);
            const allLocations = Object.values(stage.getSave().atlas || {});

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

                        const matchedActor = findBestNameMatch(moverName, allActors, ['name', 'nicknames']);
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
                        const matched = findBestNameMatch(characterName, allActors, ['name', 'nicknames']);
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
                        const matched = findBestNameMatch(characterName, allActors, ['name', 'nicknames']);
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

                const speakerLineMatch = speakerLineRegex.exec(trimmed);
                console.log(`Testing ${trimmed}\nSpeaker line match: ${speakerLineMatch ? speakerLineMatch[1].trim() : 'No match'}`);

                // Only treat lines with an ALL CAPS speaker prefix as new script entries.
                if (speakerLineMatch) {
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

            // Convert combined lines into ScriptEntry objects when an ALL CAPS speaker prefix is present.
            const scriptEntries: ScriptEntry[] = combinedLines.map((l, index) => {
                let speakerId = '';
                let message = l;
                
                const speakerLineMatch = speakerLineRegex.exec(message);
                console.log(`Processing combined line: ${message}`);
                if (speakerLineMatch) {
                    console.log(`Found speaker line match: ${speakerLineMatch[1].trim()}`);
                    console.log(speakerLineMatch);
                    const speakerName = speakerLineMatch[1].trim();
                    // Find matching actor using findBestNameMatch
                    const matched = findBestNameMatch(speakerName, save.actors ? Object.values(save.actors) : [], ['name', 'nicknames']);
                    speakerId = matched ? matched.id : ''; // Use actor ID if found, otherwise empty for narrator.
                    message = speakerLineMatch[2].trim();
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

            // If impersonation is disabled, find any player entries and remove it and everything that follows:
            if (save.disableImpersonation) {
                // If impersonation is undesired, find any entry where the speaker matches the player's name and drop all messages beyond that point.
                const playerEntryIndex = scriptEntries.findIndex(entry => entry.speakerId === stage.getPlayerActor().id);
                if (playerEntryIndex !== -1) {
                    console.log(`Player entry found at index ${playerEntryIndex}. Removing all subsequent entries to disable impersonation.`);
                    scriptEntries.splice(playerEntryIndex);
                }
            }
        

            // TTS for each entry's dialogue
            const ttsPromises = scriptEntries.map(async (entry) => {
                const actor = entry.speakerId ? save.actors[entry.speakerId] : null;
                // Only TTS if entry.speaker matches an actor from stage().getSave().actors and entry.message includes dialogue in quotes.
                if (!actor || actor.type === ActorType.PLAYER || !entry.message.includes('"') || !save.textToSpeech) {
                    console.log(`Skipping TTS: ${(!actor || actor.type === ActorType.PLAYER) ? "No matching non-player actor" : (!entry.message.includes('"') ? "No dialogue in quotes" : "Text-to-speech disabled")}.`);
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
                const endResponse = await stage.generateText(
                    buildPrompt()
                        .addBlock(`Instructions`,
                            `Analyze the provided script and determine whether the depicted scene has run its course. ` +
                            `If the scene feels complete or has reached a suitable moment to end on, output "[END SCENE]" followed by a "[SUMMARY: ...]" tag with a brief summary of the entire scene's key events and outcomes. ` +
                            `If the scene feels incomplete or unresolved, output "[CONTINUE SCENE]" and "[SUMMARY: ...]" tag with a brief explanation of what is missing or what could be developed further to reach a satisfying conclusion. ` +
                            `\n\nIf the scene is complete, utilize additional tags to highlight any significant developments, such as character relationship changes or lore entries above that require updates as a result of this scene. `
                        )
                        .addBlock('Relationship Changes',
                            `Indicate affection changes between the player and any characters involved in the scene; affection is represented as a number between 1 and 10, so adjustments should be generally incremental.\n` +
                            `[AFFECTION CHANGE: Character Name +/-x]` +
                            `\nExamples:\n[AFFECTION CHANGE: Cyanea +1]\n[AFFECTION CHANGE: Lyra -1]`
                        )
                        .addBlock('Lore Updates',
                            `Indicate the names of lore entries that may need to be updated as a result of the skit. Actual updates will be made in separate requests; this tag merely flags an entry for update.\n` +
                            `[LORE UPDATE: Lore Entry Name]` +
                            `\nExample:\n[LORE UPDATE: Cassiel]\n[LORE UPDATE: The Gardens]`
                        )
                        .addBlock('Example Response',
                            `[END SCENE]\n[SUMMARY: This expedition took ${playerName} and Cyanea to the Shells, where they encountered Red Hood and uncovered a new forma: the Coral Razor. Red Hood vehemently disagreed with ${playerName} and Cyanea on how to handle this new threat.]` +
                            `\n[AFFECTION CHANGE: Cyanea +1]\n[AFFECTION CHANGE: Red Hood -2]\n[LORE UPDATE: The Shells]\n[LORE UPDATE: Cyanea]\n[LORE UPDATE: Red Hood]\n` +
                            `#END#` +
                            `\nExample Response:\n` +
                            `[CONTINUE SCENE]\n[SUMMARY: The scene is developing well, but it would be more satisfying with a clearer moment of resolution at the end. Consider whether ${playerName} could discover a clue or have a significant interaction with another character to create a more compelling ending.]\n` +
                            `#END#`
                        )
                        .addBlock('Example Response',
                            `[CONTINUE SCENE]\n[SUMMARY: The scene is developing well, but it would be more satisfying with a clearer moment of resolution at the end. Consider whether ${playerName} could discover a clue or have a significant interaction with another character to create a more compelling ending.]\n` +
                            `#END#`
                        )
                        .addBlock('Scene Script for Analysis',
                            buildScriptLog(skit, scriptEntries, stage))
                        .addBlock('Additional Context',
                            generateContext(skit, stage, 0))
                        .format(),
                    1, 500
                );

                if (endResponse) {
                    // Strip double-asterisks. TODO: Remove this once other model issue is resolved.
                    text = text.replace(/\*\*/g, '');

                    if (endResponse.includes('[END SCENE]')) {
                        endScene = true;
                        const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(endResponse);
                        summary = summaryMatch ? summaryMatch[1].trim() : '';
                        console.log('Model determined scene should end. Summary:', summary);

                        const affectionChangeRegex = /\[AFFECTION CHANGE:\s*([^\]]+?)\s*([+-]\d+)\]/gi;
                        let match;
                        while ((match = affectionChangeRegex.exec(endResponse)) !== null) {
                            const characterName = match[1].trim();
                            const changeValue = parseInt(match[2]);
                            const matchedActor = findBestNameMatch(characterName, Object.values(save.actors), ['name', 'nicknames']);
                            if (matchedActor && !isNaN(changeValue) && changeValue !== 0) {
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
                        while ((match = loreUpdateRegex.exec(endResponse)) !== null) {
                            const loreName = match[1].trim();
                            const matchedLore = findBestNameMatch(loreName, save.lorebook || [], ['title']);
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

