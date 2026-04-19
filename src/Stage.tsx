import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, User, Character} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, ActorType, findBestNameMatch, loadSupportedActor, ActorState, getActorLore, getEmotionImage } from "./content/Actor";
import { Emotion } from "./content/Emotion";
import { AffinityChangeInfo } from "./screens/AffinityPopIn";
import { BETA_CHARACTERS, COMPLETE_CHARACTERS } from "./content/Characters";
import { Item } from "./content/Item";
import { generateContext, Skit, SkitType } from "./content/Skit";
import { createDefaultAtlas, getLinkedLocationLore, Location } from "./content/Location";
import { BaseScreen } from "./screens/BaseScreen";
import { fetchLorebook, Lore } from "./content/Lore";
import { Client } from "@gradio/client";
import { DEFAULT_PLAYER_THEME_COLOR } from "./screens/SettingsScreen";

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = {
    saves: (SaveType | undefined)[]
    lastSaveSlot: number
};

export type SaveType = {
    playerId: string;
    actors: {[key: string]: Actor};
    atlas: {[key: string]: Location};
    inventory: Item[];
    timeline: TimelineEntry[];
    turn: number;
    timestamp: number; // Time of last save
    textToSpeech?: boolean;
    language?: string;
    lorebook?: Lore[];
    expeditionChoices?: ExpeditionChoice[];
    betaMode?: boolean;
}

type ExpeditionChoice = {
    id: string;
    locationId: string;
    description: string;
    name: string;
    partnerActorIds: string[];
}

type TimelineEntry = {
    turn: number;
    description: string;
    skit?: Skit;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {


    readonly SAVE_SLOT_COUNT = 10;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';
    

    readonly INITIAL_ACTORS = 33; // Gotta load 'em all.

    saveData: ChatStateType;
    primaryUser: User;
    primaryCharacter: Character;
    generationPromises: {[key: string]: Promise<any|void>} = {};
    anticipatedLoadingPromiseCount: number = 4;
    depthPipeline: any = null;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            characters,
            users,
            config,
            messageState,
            environment,
            initState,
            chatState
        } = data;
        
        this.primaryUser = Object.values(users)[0];
        this.primaryCharacter = Object.values(characters)[0];

        // Populate default saves with SAVE_SLOT_COUNT undefines:
        this.saveData = chatState != null ? chatState : {saves: Array(this.SAVE_SLOT_COUNT).fill(undefined), lastSaveSlot: 0};

    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        this.depthPipeline = await Client.connect("ravenok/Depth-Anything-V2");

        return {
            success: true,
            error: null,
            initState: null,
            chatState: this.saveData,
        };
    }

    // Unused functions required by the interface.
    async setState(state: MessageStateType): Promise<void> {}
    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {return {}}
    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {return {}}

    pushMessage(message: string) {
        //if (this.isAuthenticated) {
            this.messenger.impersonate({
                speaker_id: this.primaryCharacter.anonymizedId,
                is_main: false,
                parent_id: null,
                message: message
            });
        //}
    }

    generateFreshSave(playerData: {name: string, personality: string, themeColor?: string}): SaveType {
        return {playerId: this.primaryUser.anonymizedId,
            actors: {
                [this.primaryUser.anonymizedId]: {
                    id: this.primaryUser.anonymizedId,
                    name: playerData.name,
                    nicknames: ['player'],
                    type: ActorType.PLAYER,
                    state: ActorState.AVAILABLE,
                    description: '',
                    profile: playerData.personality,
                    sampleImageUrl: '', // Unneeded; the player is never seen.
                    outfits: [], // Ditto.
                    outfitId: '', // Ditto.
                    fullPath: '',
                    affinity: 0,
                    themeColor: playerData.themeColor || DEFAULT_PLAYER_THEME_COLOR,
                    themeFontFamily: '',
                    voiceId: ''
                },
            },
            atlas: createDefaultAtlas(),
            inventory: [],
            timeline: [],
            turn: 0,
            timestamp: Date.now(),
        };
    }

    startNewGame(playerData: {name: string, data: Partial<SaveType>, personality: string, themeColor?: string}) {
        // Insert a dummy promise into generationPromises to ensure the loading screen shows until we manually clear it after the initial actors are loaded.
        this.generationPromises['newGame'] = new Promise(() => {});

        // Get empty save slot or replace the oldest save if all slots are full
        const emptySlotIndex = this.saveData.saves.findIndex(save => save === undefined);
        const saveSlotIndex = emptySlotIndex !== -1 ? emptySlotIndex : (this.saveData.lastSaveSlot + 1) % this.SAVE_SLOT_COUNT;

        // Create new save data structure
        const newSave: SaveType = this.generateFreshSave(playerData);
        Object.assign(newSave, playerData.data);

        this.anticipatedLoadingPromiseCount = Math.max(this.INITIAL_ACTORS - Object.keys(newSave.actors).length, 0) * 1 + 3;

        // Load Cassiel as the Warden and add to actors
        loadSupportedActor(COMPLETE_CHARACTERS.find(char => char.name === 'Cassiel') || {}, this).then(cassielActor => {
            if (cassielActor) {
                newSave.actors[`cassiel`] = cassielActor;
                this.saveGame(); // Save after adding Cassiel so that we have her in the save data when we generate her emotion images and lorebook entry.
            }
        });

        this.generationPromises['lorebook'] = fetchLorebook().then(loreEntries => {
            newSave.lorebook = loreEntries;

            // Some lore entries contain headers with ##; remove these lines.
            newSave.lorebook.forEach(entry => {
                // Use regex to remove all lines that start with ##.
                entry.content = entry.content.replace(/^##.*$/gm, '').trim();
            });

            // Insert missing, unofficial entries needed for the game: Jezreel, Clementine, and Nandemonankai
            if (!newSave.lorebook?.find(entry => entry.id === 'jezreel')) {
                newSave.lorebook?.push({
                    id: 'jezreel',
                    title: 'Jezreel',
                    type: 'character',
                    triggers: ['jezreel', 'lamia', 'college', 'collegiate', 'snob', 'sorority', 'valley-girl', 'luxe'],
                    enabled: true, constant: false, insertionOrder: 10, priority: 10, probability: 100, scanDepth: 10,
                    content: `A lamia with sorority-girl vibes, still struggling with the luxe-less life of Ardeia. She doesn't remember much from the Past, but she knows it was nicer than this.\n\n` +
                        `After ten years in Ardeia, she often still plays the snobby blonde valley-girl, even though she begrudgingly appreciates her found family and secretly enjoys doing her part to help.\n\n` +
                        `She loves sunning her scales, tanning her torso, and finding exotic new fashions for her serpentine physique, constantly on the lookout for minor ways to bring luxury or beauty into her life. She has little in the way of practical skills, ` +
                        `but has grown quite good with her bonewood spear, which she has named "Vanity."\n\n` +
                        `She speaks with a valley-girl affectation and slang, and genuinely believes this is the tongue of her people; she will get defensive about it.`
                });
            }
            if (!newSave.lorebook?.find(entry => entry.id === 'clementine')) {
                newSave.lorebook?.push({
                    id: 'clementine',
                    title: 'Clementine',
                    type: 'character',
                    triggers: ['clementine', 'naenia'],
                    enabled: true, constant: false, insertionOrder: 10, priority: 10, probability: 100, scanDepth: 10,
                    content: `Clementine Naenia is a misguidedly trusting and optimistic young woman with a nasty habit of befriending even the shadiest of characters.\n\n` +
                        `Despite her naivety, Clementine has a good heart and is more than capable of helping others around Ardeia.`
                });            
            }
            if (!newSave.lorebook?.find(entry => entry.id === 'red hood')) {
                newSave.lorebook?.push({
                    id: 'red hood',
                    title: 'Red Hood',
                    type: 'character',
                    triggers: ['red hood', 'wolfsbane', 'nikke'],
                    enabled: true, constant: false, insertionOrder: 10, priority: 10, probability: 100, scanDepth: 10,
                    content: `Red Hood is a resurrected Grimms‑series Nikke who once fought as a Goddess of Victory, died, dissolved, lived inside another Nikke, and somehow still woke up again in Ardeia with nothing but a bracer, a massive rifle, and a name she hasn’t shared. Outwardly she’s warm, mischievous, and magnetic — the kind of person who becomes the center of a room without trying — but beneath that shine sits unspoken grief, stubborn pride, and a loyalty that no longer has a home. She gives everyone a nickname before learning their real one, hates anything that feels like a cage, and talks about desire with bold confidence she doesn’t quite inhabit.\n\nIn Ardeia she drifts between factions, listens to old songs from a distance, and tries to understand what she is now that she’s no longer a goddess, a ghost, or a passenger. She’s looking for purpose, for something worth doing, and for a way to stop noticing the absence of the cassette player she gave away.`
            
                });
            }
            if (!newSave.lorebook?.find(entry => entry.id === 'nandemonankai')) {
                newSave.lorebook?.push({
                    id: 'nandemonankai',
                    title: 'Nandemonankai',
                    type: 'location',
                    triggers: ['nandemonankai', 'shop', 'plaza'],
                    enabled: true, constant: false, insertionOrder: 10, priority: 10, probability: 100, scanDepth: 10,
                    content: `A quiet, cluttered shop in the backstreets of Ardeia, where Tawamure Rei sells or exchanges an eclectic assortment of odds-and-ends.`
                });
            }

            delete this.generationPromises['lorebook'];
        }).catch(err => {
            console.error('Error fetching lorebook', err);
            delete this.generationPromises['lorebook'];
        });

        // Save the new game
        this.saveData.saves[saveSlotIndex] = newSave;
        this.saveData.lastSaveSlot = saveSlotIndex;

        // Generate a few initial characters.
        this.loadActors().finally(() => {
            console.log('Finished loading initial actors for new game');
            this.rebuildExpeditionChoices(newSave).then(() => {
                this.showPriorityMessage('Expeditions are now available.');
            });
            delete this.generationPromises['newGame']; // Clear the dummy promise to allow the loading screen to finish.
            this.saveGame();
        });
    }
    
    loadSave(slotIndex: number) {
        if (this.saveData.saves[this.saveData.lastSaveSlot]) {
            this.saveData.lastSaveSlot = slotIndex;
        }
    }

    saveToSlot(slotIndex: number) {
        this.saveData.saves[slotIndex] = JSON.parse(JSON.stringify(this.getSave()));
        this.saveData.lastSaveSlot = slotIndex;
        this.saveGame();
    }

    saveGame() {
        this.messenger.updateChatState(this.saveData);
    }

    deleteSave(slotIndex: number) {
        this.saveData.saves[slotIndex] = undefined;
        if (this.saveData.lastSaveSlot === slotIndex) {
            this.saveData.lastSaveSlot = this.saveData.saves.findIndex(save => save !== undefined) ?? 0;
        }
        this.saveGame();
    }

    getSave(): SaveType {
        return this.saveData.saves[this.saveData.lastSaveSlot] || this.generateFreshSave({name: this.primaryUser.name, personality: this.primaryUser.chatProfile});
    }

    getPlayerActor(): Actor {
        return Object.values(this.getSave().actors).find(actor => actor.type === 'PLAYER')!;
    }

    getWardenActor(): Actor {
        return Object.values(this.getSave().actors).find(actor => actor.type === 'WARDEN')!;
    }

    getPrisonerActors(): Actor[] {
        return Object.values(this.getSave().actors).filter(actor => actor.type === 'PRISONER');
    }

    getCurrentSkit(): Skit | null {
        // Returns the most recent skit with no ending from the timeline, or null if there is no such skit.
        const save = this.getSave();
        if (!save.timeline || save.timeline.length === 0) {
            return null;
        }
        // Get last entry with a skit that is not marked as over:
        for (let i = save.timeline.length - 1; i >= 0; i--) {
            const entry = save.timeline[i];
            if (entry.skit && !entry.skit.over) {
                return entry.skit;
            }
        }
        return null;
    }

    private isArdeiaLocationId(locationId: string): boolean {
        return locationId.startsWith('ardeia-');
    }

    private pickRandom<T>(items: T[]): T | null {
        if (!items.length) {
            return null;
        }
        const index = Math.floor(Math.random() * items.length);
        return items[index] || null;
    }

    private takeRandomDistinct<T>(items: T[], count: number): T[] {
        const pool = [...items];
        const selections: T[] = [];

        while (pool.length > 0 && selections.length < count) {
            const index = Math.floor(Math.random() * pool.length);
            const [item] = pool.splice(index, 1);
            if (item !== undefined) {
                selections.push(item);
            }
        }

        return selections;
    }

    private getDiscoveredOutsideLocations(save: SaveType): Location[] {
        return Object.values(save.atlas || {}).filter(
            location => location.discovered && !this.isArdeiaLocationId(location.id),
        );
    }

    private getEligibleExpeditionActorsFromSave(save: SaveType): Actor[] {
        return Object.values(save.actors || {}).filter(actor =>
            actor.state === ActorState.AVAILABLE &&
            actor.type == ActorType.PRISONER
        );
    }

    private async rebuildExpeditionChoices(save: SaveType = this.getSave()): Promise<ExpeditionChoice[]> {
        save.expeditionChoices = [];
        this.saveGame();
        
        const discoveredOutsideLocations = this.getDiscoveredOutsideLocations(save);
        const eligibleActors = this.getEligibleExpeditionActorsFromSave(save);

        const parseChoices = (text: string): ExpeditionChoice[] => {
            const parsed: ExpeditionChoice[] = [];
            // Split on blank lines or on a new DESTINATION: block
            const blocks = text.split(/(?=DESTINATION:)/i).map(b => b.trim()).filter(Boolean);
            for (const block of blocks) {
                const destMatch = block.match(/^DESTINATION:\s*(.+)/im);
                const partnerMatch = block.match(/^PARTNER:\s*(.+)/im);
                const summaryMatch = block.match(/^SUMMARY:\s*(.+)/im);
                const nameMatch = block.match(/^NAME:\s*(.+)/im);

                if (!destMatch || !partnerMatch || !summaryMatch || !nameMatch) continue;

                const destName = destMatch[1].trim();
                const partnerName = partnerMatch[1].trim();
                const summary = summaryMatch[1].trim();
                const name = nameMatch[1].trim();

                const location = findBestNameMatch(destName, discoveredOutsideLocations);
                const actor = findBestNameMatch(partnerName, eligibleActors, ['name', 'nicknames']);

                if (!location || !actor) continue;

                parsed.push({
                    id: `expedition-${location.id}-${actor.id}`,
                    locationId: location.id,
                    description: summary,
                    name,
                    partnerActorIds: [actor.id],
                });
            }
            return parsed;
        };

        let choices: ExpeditionChoice[] = [];
        let attempts = 0;
        while (choices.length === 0 && attempts < 3) {
            attempts++;
            const response = await this.generator.textGen({
                prompt: generateContext(undefined, this, 5) +
                    `\n\nEligible Partners:\n${eligibleActors.map(actor => `  ${actor.name}\n    Profile: ${actor.profile}\n    Lore: ${getActorLore(actor.id, this)}`).join('\n')}` +
                    `\n\nPossible Destinations:\n${discoveredOutsideLocations.map(location => `  ${location.name}\n    ${getLinkedLocationLore(location.name, this)}`).join('\n')}` +
                    `\n\nThis is a request for structured content for a game. Given the context, eligible partners, and possible destinations above, generate and output three potential expeditions, ` +
                    `each with a destination, partner, short summary/goal, and abbreviated name. ` +
                    `Ensure that at least one option is a natural continuation of ongoing events and at least one is a new and unexpected development with an underutilized character. ` +
                    `If a character has just returned from an expedition, avoid sending them out again so soon. ` +
                    `The summary/goal will be used as guidance for the skit that ensues and can include motives, challenges, or objectives to consider; it is not user-facing content.` +
                    `\n\nExample Response:\n` +
                    `DESTINATION: The Cradle\n` +
                    `PARTNER: Mel\n` +
                    `SUMMARY: The last expedition the Cradle found something strange. A key, perhaps. Cassiel is sending the Prisoners back with it; whether to use it or destroy it remains unclear.\n` +
                    `NAME: Return the Key with Mel\n\n` +
                    `DESTINATION: Pilgrimage\n` +
                    `PARTNER: Lyra\n` +
                    `SUMMARY: Lyra has been quiet lately. Maybe a change of scenery will help her open up? Maybe it will drive her further into herself?\n` +
                    `NAME: Take Lyra on a Pilgrimage\n\n` +
                    `DESTINATION: The Core\n` +
                    `PARTNER: Milliette\n` +
                    `SUMMARY: Everyone's looking for Reitia. Milliette believes she's the only one who can do it. She doesn't realize that success might cost her.\n` +
                    `NAME: Join Milliette at the Core\n\n` +
                    `#END#`,
                min_tokens: 100,
                max_tokens: 500,
                include_history: true,
                stop: ['#END']
            });
            if (response?.result) {
                choices = parseChoices(response.result);
            }
        }

        if (choices.length > 0) {
            save.expeditionChoices = choices;
            this.saveGame();
        }

        return save.expeditionChoices ?? [];
    }

    private buildTravelTimelineDescription(location: Location): string {
        if (this.isArdeiaLocationId(location.id)) {
            return `Visited ${location.name}.`;
        }
        return `Journeyed to ${location.name}.`;
    }

    startTravelSkit(selectedLocationId: string): Skit | null {
        const save = this.getSave();
        const selectedLocation = save.atlas[selectedLocationId];

        if (!selectedLocation) {
            return null;
        }

        let skit: Skit;

        if (this.isArdeiaLocationId(selectedLocation.id)) {
            skit = new Skit({
                skitType: SkitType.SOCIAL,
                initialLocationId: selectedLocation.id,
                guidance: '',
                script: [],
                initialActors: [],
                summary: '',
            });
        } else {
            // if there's an expedition, the initial actors should be the partner IDs from the expedition:
            const potentialInitialActors = this.getEligibleExpeditionActorsFromSave(save);
            const expedition = save.expeditionChoices?.find(choice => choice.locationId === selectedLocation.id);
            const initialActors = expedition ? expedition.partnerActorIds : [this.pickRandom(potentialInitialActors)?.id].filter(Boolean);

            skit = new Skit({
                skitType: SkitType.EXPEDITION,
                initialLocationId: selectedLocation.id,
                guidance: expedition?.description || '',
                script: [],
                initialActors: initialActors,
                summary: '',
            });
        }

        save.turn += 1;
        if (!save.timeline) {
            save.timeline = [];
        }
        save.timeline.push({
            turn: save.turn,
            description: this.buildTravelTimelineDescription(selectedLocation),
            skit,
        });

        return skit;
    }

    endSkit() {
        const save = this.getSave();
        const currentSkit = this.getCurrentSkit();
        if (currentSkit) {
            currentSkit.over = true;
            save.turn += 1;
        }

        // This is where various outcomes of the skit are processed and applied to the save state
        // Get the final entry of the skit and process outcomes:
        console.log(`Processing outcomes for skit:`);
        const outcomes = currentSkit?.script[currentSkit.script.length - 1]?.outcomes || [];
        console.log(outcomes);
        for (const outcome of outcomes) {
            switch (outcome.type) {
                case 'LORE_UPDATE':
                    // For lore updates, we expect details to include a loreEntry with id, title, and content.
                    const loreEntry = findBestNameMatch(outcome.details?.loreTitle, save.lorebook || [], ['title']);
                    if (loreEntry) {
                        // Make a textGen call with context and the current lore entry, asking for revisions based on context.
                        this.generator.textGen({
                            prompt: generateContext(undefined, this, 3) + 
                                `\n\nTarget Lore Title:\n${loreEntry.title}\nContent for Revision:\n${loreEntry.content}` +
                                `\n\nBased on the current context and recent events, output an updated or revised version of the content above using the below format, ` +
                                `taking care to maintain all information from the original that remains true. ` +
                                `\n\nExample Response:` +
                                `\nPLANNING: <explanation of changes to made and existing content to retain.>` +
                                `\nCONTENT: <revised content, including relevant updates and persisting other accurate details from the original.>` +
                                `\n#END#` +
                                `\n\nIf there are no significant changes, simply return the original content verbatim, followed by #END#.`,
                            min_tokens: 10,
                            max_tokens: 1000,
                            include_history: true,
                            stop: ['#END']
                        }).then(response => {
                            if (response?.result) {
                                // If "CONTENT:" occurs in the response, eliminate everything before it; use split.
                                loreEntry.content = response.result.split('CONTENT:').pop()?.trim() || loreEntry.content;
                                this.saveGame();
                            }
                        });
                    }
                    break;
                case 'RELATIONSHIP_CHANGE': {
                    // For relationship changes, we expect details to include actorId and change (e.g. +10 or -5).
                    const actor = findBestNameMatch(outcome.details?.actorName, Object.values(save.actors), ['name', 'nicknames']);
                    if (actor) {
                        const previousAffinity = actor.affinity;
                        actor.affinity = Math.min(10, Math.max(0, actor.affinity + (outcome.details?.changeValue || 0)));
                        const effectiveChange = actor.affinity - previousAffinity;
                        // If affinity effectively changed, show a heart portrait pop-in at the top of the screen.
                        if (effectiveChange !== 0) {
                            const isPositive = effectiveChange > 0;
                            const emotionKey = isPositive
                                ? (getEmotionImage(actor, Emotion.joy) ? Emotion.joy :
                                   getEmotionImage(actor, Emotion.love) ? Emotion.love :
                                   getEmotionImage(actor, Emotion.kindness) ? Emotion.kindness : Emotion.neutral)
                                : (getEmotionImage(actor, Emotion.sadness) ? Emotion.sadness :
                                   getEmotionImage(actor, Emotion.disappointment) ? Emotion.disappointment : Emotion.neutral);
                            const portraitUrl = getEmotionImage(actor, emotionKey);
                            this.showAffinityChange({
                                id: `${actor.id}-${Date.now()}`,
                                actorName: actor.name,
                                portraitUrl,
                                change: effectiveChange,
                                themeColor: actor.themeColor || '#ffffff',
                            });
                        }
                    }
                    break;
                }
            }
        }
                    

        this.rebuildExpeditionChoices(save).then(() => {
            this.showPriorityMessage('Expeditions are now available.');
        });

        this.saveGame();
    }

    // Callback to show priority messages in the tooltip bar
    private priorityMessageCallback?: (message: string, icon?: any, durationMs?: number) => void;

    // Callback to show affinity change pop-ins
    private affinityChangeCallback?: (info: AffinityChangeInfo) => void;

    /**
     * Register a callback to display affinity change pop-ins.
     */
    setAffinityChangeCallback(callback: (info: AffinityChangeInfo) => void) {
        this.affinityChangeCallback = callback;
    }

    /**
     * Trigger an affinity change pop-in.
     */
    showAffinityChange(info: AffinityChangeInfo) {
        if (this.affinityChangeCallback) {
            this.affinityChangeCallback(info);
        }
    }

    /**
     * Register a callback to show priority messages in the tooltip bar.
     * This is typically set by the App component that has access to the TooltipContext.
     */
    setPriorityMessageCallback(callback: (message: string, icon?: any, durationMs?: number) => void) {
        this.priorityMessageCallback = callback;
    }

    /**
     * Show a priority message in the tooltip bar that temporarily overrides normal tooltips.
     * @param message The message to display
     * @param icon Optional icon to show with the message
     * @param durationMs How long to show the message (default: 5000ms)
     */
    showPriorityMessage(message: string, icon?: any, durationMs: number = 5000) {
        if (this.priorityMessageCallback) {
            this.priorityMessageCallback(message, icon, durationMs);
        } else {
            console.warn('Priority message callback not set:', message);
        }
    }

        async makeImage(imageRequest: Object, defaultUrl: string): Promise<string> {
        return (await this.generator.makeImage(imageRequest))?.url ?? defaultUrl;
    }

    async makeImageFromImage(imageToImageRequest: any, defaultUrl: string): Promise<string> {

        const imageUrl = (await this.generator.imageToImage(imageToImageRequest))?.url ?? defaultUrl;
        if (imageToImageRequest.remove_background && imageToImageRequest.transfer_type == 'edit' && imageUrl != defaultUrl) {
            try {
                return this.removeBackground(imageUrl);
            } catch (exception: any) {
                console.error(`Error removing background from image, error`, exception);
                return imageUrl;
            }
        }
        return imageUrl;
    }

    async removeBackground(imageUrl: string) {
        if (!imageUrl) return imageUrl;
        try {
            const imageResponse = await fetch(imageUrl);
            console.log('Retrieved image');
            const fileName = `backgroundless_${Date.now()}.png`;
            const backgroundlessResponse = await this.depthPipeline.predict("/remove_background", {image: await imageResponse.blob()});
            console.log('Background removed');
            console.log(backgroundlessResponse);
            const data = await fetch(backgroundlessResponse.data[1].url);
            const blob = await data.blob();
            const file: File = new File([blob], fileName, {type: 'image/png'});
            return await this.uploadFile(fileName, file);
        } catch {
            try {
                console.warn (`Falling back to Chub's background removal.`);
                const response = await this.generator.removeBackground({image: imageUrl});
                return response?.url ?? imageUrl;
            } catch (error) {
                console.error(`Error removing background`, error);
                return imageUrl;
            }
        }
    }

    async uploadFile(fileName: string, file: File): Promise<string> {
        // Don't honor file's name; want to overwrite existing content that may have had a different actual name.
        const updateResponse = await this.storage.set(fileName, file).forUser();
        if (!updateResponse.data || updateResponse.data.length == 0) {
            throw new Error('Failed to upload file to storage.');
        }
        console.log('Uploaded file:');
        console.log(updateResponse);
        return updateResponse.data[0].value;
    }

    async loadActors() {
        if (Object.keys(this.generationPromises).includes('loadActors')) {
            return this.generationPromises['loadActors'];
        }

        const promise = new Promise<string>(async (resolve, reject) => {
            try {
                console.log(`Loading reserve actors...${Object.keys(this.getSave().actors || {}).length}`);
                console.log(this.getSave().actors);
                let actors = this.getSave().actors || {};
                const minLoopDurationMs = 1000;
                while (Object.keys(actors).length < this.INITIAL_ACTORS) {
                    // Load one random actor from a hardcoded whitelist of fullPaths (COMPLETE_CHARACTERS); filter out characters that are already in actors
                    console.log('Loading reserve actor from supported characters...');
                    const character = this.pickRandom((this.getSave().betaMode ? [...COMPLETE_CHARACTERS, ...BETA_CHARACTERS] : COMPLETE_CHARACTERS).filter(charDef => !Object.values(actors).some(actor => actor.name === charDef.name)));
                    if (!character) {
                        console.warn('No more supported characters to load as reserve actors.');
                        break;
                    } else if (!character.name || !character.fullPath) {
                        continue;
                    }
                    // Enforce a minimum loop duration; loadSupportedActor time counts toward this.
                    const loopStartTime = Date.now();

                    const loadPromise = loadSupportedActor(character, this);
                    this.generationPromises[`loading ${character.name}`] = loadPromise;
                    loadPromise.then(() => delete this.generationPromises[`loading ${character.name}`]);

                    const newActor = await loadPromise;
                    const loopElapsedMs = Date.now() - loopStartTime;
                    if (loopElapsedMs < minLoopDurationMs) {
                        await new Promise(resolve => setTimeout(resolve, minLoopDurationMs - loopElapsedMs));
                    }
                    if (newActor) {
                        console.log(`Loaded reserve actor ${newActor.name} from fullPath ${newActor.fullPath}`);
                        this.getSave().actors = {...actors, [newActor.id]: newActor};
                        actors = this.getSave().actors || {};
                    } else {
                        console.warn(`Failed to load actor from fullPath ${character.fullPath}`);
                    }
                }
                console.log('Finished loading reserve actors');
                delete this.generationPromises['loadActors'];
                this.saveGame();
                resolve('');
            } catch (err) {
                console.error('Error loading reserve actors', err);
                delete this.generationPromises['loadActors'];
                reject(err);
            }
        });

        console.log('Set promise');
        this.generationPromises['loadActors'] = promise;
        return promise;
    }

    isVerticalLayout(): boolean {
        // Determine if the layout should be vertical based on window aspect ratio
        // Vertical layout when height > width (portrait orientation)
        return window.innerHeight > window.innerWidth;
    }

    render(): ReactElement {
        return <BaseScreen stage={() => this}/>;
    }

}
