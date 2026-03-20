import { Emotion, EMOTION_MAPPING } from "./Emotion";
import { v4 as generateUuid } from 'uuid';
import { Outcome } from "./Outcome";
import { Stage } from "../Stage";
import { Actor, findBestNameMatch } from "./Actor";

export enum SkitType {
    INTRO = 'INTRO',
    SOCIAL = 'SOCIAL',
    ADVENTURE = 'ADVENTURE',
    DISCOVERY = 'DISCOVERY',
}

export class Skit {
    id: string = '';
    skitType: SkitType = SkitType.SOCIAL;
    script: ScriptEntry[] = [];
    initialActors: string[] = []; // List of Actor IDs present in this skit
    initialLocationId: string = ''; // Initial location for the skit, can be used to set background or context
    summary: string = ''; // Final summary of this skit
    
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
    actorAppearances: {[key: string]: string} = {}; // Map of appearance changes by actor ID (e.g. outfit changes)
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

export const determineAppearance = (actorId: string, skit: Skit, index: number): string => {
    let appearanceId = '';
    for (let i = index; i >= 0; i--) {
        const line = skit.script[i];
        if (line && line.actorAppearances && line.actorAppearances[actorId]) {
            appearanceId = line.actorAppearances[actorId];
            break;
        }
    }
    return appearanceId;
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

export function getCurrentAppearances(skit: Skit, stage: Stage, upToEntryIndex: number): {[actorId: string]: string} {

    return getCurrentActors(skit, upToEntryIndex).reduce((appearances, actorId) => {
        appearances[actorId] = determineAppearance(actorId, skit, upToEntryIndex);
        return appearances;
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
            const emotionKeys = Object.keys(e.actorEmotions || {});
            const candidates = emotionKeys.map(key => ({ name: key }));
            const bestMatch = findBestNameMatch(e.speakerId, candidates);
            const matchingKey = bestMatch?.name;
            const emotionText = matchingKey ? ` [${matchingKey} expresses ${e.actorEmotions?.[matchingKey]}]` : '';
            const wearsText = Object.entries(e.actorAppearances || {}).map(([actorId, appearanceId]) => {
                const actor = stage?.getSave().actors?.[actorId];
                const appearance = actor?.appearances.find(o => o.id === appearanceId);
                return actor && appearance ? ` [${actor.name} wears ${appearance.name}]` : '';
            }).join('');
            return `${e.speakerId}:${e.message}${emotionText}${wearsText}`;
        }).join('\n')
        : '(None so far)';
}

export function buildSkitTypePrompt(skit: Skit, stage: Stage): string {
    switch (skit.skitType) {
        case SkitType.INTRO:
            return `This scene introduces the beginning of the story, as the player awakens in Ardeia.`;
        case SkitType.SOCIAL:

        default:
            return '';
    }
}

export function buildPremise(playerName: string): string {
    return `This game is a post-apocalyptic science-fantasy game in which the world is an unknowable relic of its past self. ` +
            `The denizens of this world—referred to as 'prisoners'—have been pulled from across time, resulting in a diverse and eclectic mix of characters. Most have only vague memories of their past lives, ` +
            `but all have rich and detailed personalities that persist and even new motives driving their existence in a new world. ` +
            `All prisoners live in the sole populated city of Ardeia and serve its Warden, Cassiel, an eight-foot, angelic woman who oversees the city's operations with a mix of benevolence and authority. ` +
            `The player of this game, ${playerName}, is one of the many prisoners, bearing the signature bracer that binds them to Ardeia and the Warden. ` +
            `The prisoners work to keep the city running while also exploring the Outside, beyond the cities walls and Barriers. Some are new arrivals, while others have been here for centuries. ` +
            `These expeditions discover all manner of otherworldly artifacts and remnants among the mysterious, war-torn, or overgrown ruins of the old world, including relics, constructs, forma, and errata. `;
}

function generateSkitContext(skit: Skit, stage: Stage, historyLength: number): string {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();
    const location = save.atlas[skit.initialLocationId];
    const pastEvents = (save.timeline ? save.timeline.slice(-historyLength) : []).filter(e => e.skit !== skit);
    const currentActors = getCurrentActors(skit, skit.script.length - 1).map(actorId => save.actors?.[actorId]).filter(actor => actor !== undefined && actor !== stage.getPlayerActor()) as Actor[];
    
    const coreContext = `{{messages}}\nPremise: ${buildPremise(playerName)}\n` +
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
        `\n\nCurrent scene summary: ${skit.summary || '(No summary yet)'}` +
        (location ? (`\n\nCurrent Location:\n  The following scene is set in ` +
            `${location.name || 'Unknown Location'}. ${location.description || 'No description available.'}\n`) : '') +

        `\n\nPlayer Profile for ${playerName}:\n  ${stage.getPlayerActor()?.profile || 'No profile available.'}\n` +
        `\n\nCharacters in this Scene:\n${currentActors.map(actor => {
            const currentApperance = actor.appearances.find(a => a.id === determineAppearance(actor.id, skit, skit.script.length - 1)) ?? actor.appearances[0];
            const otherAppearances = actor.appearances.filter(o => o.id !== currentApperance?.id && o.emotionPack['neutral']);
            return `  ${actor.name}\n    Current Appearance (${currentApperance.name}): ${currentApperance.description}\n` +
                (otherAppearances.length > 0 ? `    Other Appearances: ${otherAppearances.map(o => o.name).join(', ')}\n` : '') +
                `    Profile: ${actor.profile}\n    Character Arc: ${actor.characterArc}`}).join('\n')}`;
    return coreContext;
}

export async function generateSkitScript(skit: Skit, stage: Stage): Promise<ScriptEntry[]> {
    const playerName = stage.getPlayerActor()?.name || 'The Prisoner';
    const save = stage.getSave();

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
            `\n\nPrimary Instruction:\n` +
                `  ${skit.script.length == 0 ? 'Produce the initial moments of a scene (perhaps joined in medias res)' : 'Extend or conclude the current scene script'} with three to five entries, ` +
                `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags, if warranted. ` +
                `The script should tacitly consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
                `\n\n  Follow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Characters present their own actions and dialogue, while other events within the scene are attributed to NARRATOR. ` +
                `Although a loose script format is employed, the actual content should be professionally edited narrative prose. ` +
                //(stage.getSave().disableImpersonation ? 
                //    `New entries refer to the player, ${stage.getSave().player.name}, in second-person; all other characters are referred to in third-person, even in their own entries.` :
                (    `Entries from the player, ${playerName}, are written in first-person, while other entries consistently refer to ${playerName} in second-person; all other characters are referred to in third-person, even in their own entries.`) +
                `\n\nTag Instruction:\n` +
                `  Embedded within this script, you may employ special tags to trigger various game mechanics. ` +
                `\n\n  Emotion tags ("[CHARACTER NAME expresses JOY]") should be used to indicate visible emotional shifts in a character's appearance using a single-word emotion name. ` +
                `\n\n  Appearance tags ("[CHARACTER NAME wears APPEARANCE NAME]") should be used when a character changes appearance. ` +
                    `When establishing a character at the beginning of a scene or when moving to this location with a movement tag, give special consideration to the inclusion of a 'wears' tag to explicitly call out an appropriate look. ` +
                    `APPEARANCE NAME must be found under the specified character—either their current appearance or one of their listed alternatives. ` +
                `\n\n  A Character movement tag ("[CHARACTER NAME moves HERE]") must be used when an Absent Character enters the scene. ` +
                `\n\n  Character movement tags ("[CHARACTER NAME moves AWAY]") must also be included when a character leaves the scene or moves to another location. ` +
                `\n\n  A Scene movement tag ("[SCENE moves LOCATION]") may be used when the scene itself transitions to another location. ` +
                `When this tag is used, all characters currently present in the scene are treated as relocating together; if anyone splits up, they will require a separate movement tag. ` +
                `\n\n  For movement tags, LOCATION should be the name of an existing location, or simply "HERE" to move to the scene's location, or "AWAY" to leave this area. ` +
                `The game engine relies upon movement tags to update character locations and visually display character presence in scenes, so it is essential to use these tags when Absent Characters enter the scene, Present Characters leave, or the scene itself relocates. ` +
                `These tags are not presented to users, so the narrative content of the script should also organically mention characters entering, exiting, or relocating. ` +
                `\n\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments or concrete details which would fundamentally alter or subvert the mechanics of the game. ` +
                (skit.script.length == 0 ? 'As this is the initial, establishing moment of a new scene, evaluate the current appearance and alternative appearances of each character and use Appearance ("wears") tags to update the characters to the most appropriate outfit for the moment. ' : '') +
                `Generally, focus upon interpersonal dynamics, character growth, and discovery or trials within this strange world. ` +
                ((save.language || 'English').toLowerCase() !== 'english' ? `\n\nNote: The game is now being played in ${save.language}. Regardless of historic language use, generate this skit content in ${save.language} accordingly. Special emotion, appearance, and movement tags continue to use English (these are invisible to the user).` : '');

    let retry = 0;
    while (retry < 3) {
        const response = await stage.generator.textGen({
                // Reduce history size with successive retries.
                prompt: `${generateSkitContext(skit, stage, 7 - retry * 2)}\n\n${mainPrompt}`,
                min_tokens: 10,
                max_tokens: 600,
                include_history: true,
                stop: []
        });
        if (response && response.result && response.result.trim().length > 0) {
            // Strip all double asterisks; this is a temporary measure due to current model behavior.
            let text = response.result.replace(/\*\*/g, '').trim();
            let endScene = false;
            let summary = '';
            let parsedSceneLocationId = getCurrentLocation(skit, -1);
            let parsedCurrentActors = getCurrentActors(skit, -1);
            const parsedCurrentAppearances = getCurrentAppearances(skit, stage, -1);

            // Remove any initial "System:" prefix
            if (text.toLowerCase().startsWith('system:')) {
                text = text.slice(7).trim();
            }

            // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
            const lines = text.split('\n');
            const combinedLines: string[] = [];
            const combinedTagData: {emotions: {[key: string]: Emotion}, appearanceChanges: {[actorId: string]: string}, updatedActors?: string[], updatedLocationId?: string}[] = [];
            let currentLine = '';
            let currentEmotionTags: {[key: string]: Emotion} = {};
            let currentAppearanceChanges: {[actorId: string]: string} = {};
            let currentUpdatedActors: string[] | undefined;
            let currentUpdatedLocationId: string | undefined;

            for (const line of lines) {
                // Skip empty lines
                let trimmed = line.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, '\'');

                console.log(`Process line: ${trimmed}`);

                // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                const newEmotionTags: {[key: string]: Emotion} = {};
                const newAppearanceChanges: {[actorId: string]: string} = {};
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


                    // Handle appearance tags:
                    const appearanceTagRegex = /([^[\]]+)\s+wears\s+([^[\]]+)/gi;
                    let appearanceMatch = appearanceTagRegex.exec(raw);
                    if (appearanceMatch) {
                        const characterName = appearanceMatch[1].trim();
                        const appearanceName = appearanceMatch[2].trim();
                        // Find matching actor using findBestNameMatch
                        const matched = findBestNameMatch(characterName, allActors);
                        if (!matched) continue;

                        // Find matching appearance for this actor
                        const matchedAppearance = findBestNameMatch(appearanceName, matched.appearances || []);
                        if (!matchedAppearance) {
                            console.warn(`Appearance "${appearanceName}" not found for ${matched.name}; skipping tag.`);
                            continue;
                        }

                        newAppearanceChanges[matched.id] = matchedAppearance.id;
                        console.log(`Appearance tag: ${matched.name} wears ${matchedAppearance.name}`);
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
                        newEmotionTags[matched.name] = finalEmotion;
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
                            appearanceChanges: currentAppearanceChanges,
                            updatedActors: currentUpdatedActors,
                            updatedLocationId: currentUpdatedLocationId
                        });
                    }
                    currentLine = trimmed;
                    currentEmotionTags = newEmotionTags;
                    currentAppearanceChanges = newAppearanceChanges;
                    currentUpdatedActors = newUpdatedActors;
                    currentUpdatedLocationId = newUpdatedLocationId;
                } else {
                    // Continuation of previous line
                    currentLine += '\n' + trimmed;
                    currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                    currentAppearanceChanges = {...currentAppearanceChanges, ...newAppearanceChanges};
                    currentUpdatedActors = newUpdatedActors || currentUpdatedActors;
                    currentUpdatedLocationId = newUpdatedLocationId || currentUpdatedLocationId;
                }
            }
            if (currentLine) {
                combinedLines.push(currentLine.trim());
                combinedTagData.push({
                    emotions: currentEmotionTags,
                    appearanceChanges: currentAppearanceChanges,
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
                    speakerId = matched ? matched.id : ''; // Use actor ID if found, otherwise keep original name
                    message = l.slice(idx + 1).trim();
                }
                
                // Remove any remaining tags
                message = message.replace(/\[([^\]]+)\]/g, '').trim();
                
                const entry: ScriptEntry = { speakerId: speakerId, message, speechUrl: '', actorEmotions: {}, actorAppearances: {}, outcomes: [] };
                const tagData = combinedTagData[index];
                
                if (tagData.emotions && Object.keys(tagData.emotions).length > 0) {
                    entry.actorEmotions = tagData.emotions;
                }
                if (tagData.updatedActors) {
                    entry.updatedActors = [...tagData.updatedActors];
                }
                if (tagData.appearanceChanges && Object.keys(tagData.appearanceChanges).length > 0) {
                    entry.actorAppearances = tagData.appearanceChanges;
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
                    const appearanceChanges = entry.actorAppearances || {};
                    const nextEntry = scriptEntries[scriptEntries.indexOf(entry) + 1];
                    if (nextEntry) {
                        if (updatedActors) {
                            nextEntry.updatedActors = [...updatedActors];
                        }
                        nextEntry.actorEmotions = {...(nextEntry.actorEmotions || {}), ...emotions};
                        nextEntry.actorAppearances = {...(nextEntry.actorAppearances || {}), ...appearanceChanges};
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
                const endPrompt = generateSkitContext(skit, stage, 0) +
                    `\n\nScene Script for Analysis:\n${buildScriptLog(skit, scriptEntries, stage)}` +
                    `\n\nInstruction:\nAnalyze the preceding scene script and determine whether the final moments make for a suitable ending to the scene. ` +
                    `If the scene feels complete or has reached a good suspended moment, output "[END SCENE]" followed by a "[SUMMARY: ...]" tag with a brief summary of the entire scene's key events or outcomes. ` +
                    `If the scene does not feel complete, output "[CONTINUE SCENE]" and "[SUMMARY: ...]" tag with a brief explanation of what is missing or what could be developed further to reach a satisfying conclusion. ` +
                    `Example Response:\n` +
                    `[END SCENE]\n[SUMMARY: This excursion took ${playerName} to a new location where they encountered a new threat and uncovered a mysterious new errata, the Coral Razor.]` +
                    `Example Response:\n` +
                    `[CONTINUE SCENE]\n[SUMMARY: The scene is developing well, but it would be more satisfying with a clearer moment of resolution or suspense at the end. Consider whether ${playerName} could discover a new clue or have a significant interaction with another character to create a more compelling ending.]`;
                
                const endResponse = await stage.generator.textGen({
                    prompt: endPrompt,
                    min_tokens: 1,
                    max_tokens: 150,
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
                    }
                }
            })());

            // Wait for all TTS generation to complete
            await Promise.all(ttsPromises);

            // Attach endScene and endProperties to the final entry if the scene ended
            if (endScene && scriptEntries.length > 0) {
                const finalEntry = scriptEntries[scriptEntries.length - 1];
                finalEntry.endScene = true;
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

