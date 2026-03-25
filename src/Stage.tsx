import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, User, Character} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, ActorType, findBestNameMatch, generateEmotionImage, distillActor, SUPPORTED_CHARACTERS, loadSupportedActor } from "./content/Actor";
import { Item } from "./content/Item";
import { generateContext, Skit, SkitType } from "./content/Skit";
import { createDefaultAtlas, Location } from "./content/Location";
import { BaseScreen } from "./screens/BaseScreen";
import { v4 as generateUuid } from 'uuid';
import { Emotion, EmotionPromptMap } from "./content/Emotion";
import { fetchLorebook, Lore } from "./content/Lore";

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
    emotionPrompts?: EmotionPromptMap;
}

type ExpeditionChoice = {
    id: string;
    locationId: string;
    description: string;
    partnerActorIds: string[];
}

type TimelineEntry = {
    turn: number;
    description: string;
    skit?: Skit;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {


    readonly SAVE_SLOT_COUNT = 10;
    readonly FETCH_AT_TIME = 200;
    readonly bannedTagsDefault = [
        'FUZZ',
        'child',
        'teenager',
        'narrator',
        'underage',
        'multi-character',
        'multiple characters',
        'nonenglish',
        'non-english',
        'famous people',
        'celebrity',
        'real person',
        'feral'
    ];
    // At least one of these is required for a faction search; helps indicate that the card has a focus on setting or tone.
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{EXCLUSIONS}}&page={{PAGE_NUMBER}}&tags={{SEARCH_TAGS}}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false` +
        `&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=5000` +
        `&require_expressions=true&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false&min_tags=3`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';
    

    readonly INITIAL_ACTORS = 6;

    saveData: ChatStateType;
    primaryUser: User;
    primaryCharacter: Character;
    betaMode: boolean;
    generationPromises: {[key: string]: Promise<any|void>} = {};
    anticipatedLoadingPromiseCount: number = 5;

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

        this.betaMode = config?.beta_mode === "True";

    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
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

    generateFreshSave(playerData: {name: string, personality: string}): SaveType {
        return {playerId: this.primaryUser.anonymizedId,
            actors: {
                [this.primaryUser.anonymizedId]: {
                    id: this.primaryUser.anonymizedId,
                    name: playerData.name,
                    type: ActorType.PLAYER,
                    profile: playerData.personality,
                    sampleImageUrl: '', // Unneeded; the player is never seen.
                    appearances: [], // Ditto.
                    appearanceId: '', // Ditto.
                    fullPath: '',
                    characterArc: '',
                    themeColor: '',
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

    startNewGame(playerData: {name: string, personality: string}) {
        // Insert a dummy promise into generationPromises to ensure the loading screen shows until we manually clear it after the initial actors are loaded.
        this.generationPromises['newGame'] = new Promise(() => {});

        // Get empty save slot or replace the oldest save if all slots are full
        const emptySlotIndex = this.saveData.saves.findIndex(save => save === undefined);
        const saveSlotIndex = emptySlotIndex !== -1 ? emptySlotIndex : (this.saveData.lastSaveSlot + 1) % this.SAVE_SLOT_COUNT;

        // Create new save data structure
        const newSave: SaveType = this.generateFreshSave(playerData);

        this.anticipatedLoadingPromiseCount = Math.max(this.INITIAL_ACTORS - Object.keys(newSave.actors).length, 0) * 3 + 3;

        // Load Cassiel as the Warden and add to actors
        loadSupportedActor('cassiel', this).then(cassielActor => {
            if (cassielActor) {
                newSave.actors[`cassiel`] = cassielActor;
                this.saveGame(); // Save after adding Cassiel so that we have her in the save data when we generate her emotion images and lorebook entry.
            }
        });

        this.generationPromises['cassiel'] = new Promise(() => {});
        generateEmotionImage(newSave.actors[`cassiel`], "neutral" as Emotion, this, false, 'default').finally(() => {
            delete this.generationPromises['cassiel'];
        });

        this.generationPromises['lorebook'] = fetchLorebook().then(loreEntries => {
            newSave.lorebook = loreEntries;
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
            this.rebuildExpeditionChoices(newSave);
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

    private getPrisonerActorsFromSave(save: SaveType): Actor[] {
        return Object.values(save.actors || {}).filter(actor => actor.type === ActorType.PRISONER);
    }

    private rebuildExpeditionChoices(save: SaveType = this.getSave()): ExpeditionChoice[] {
        
        const discoveredOutsideLocations = this.getDiscoveredOutsideLocations(save);
        const prisonerActors = this.getPrisonerActorsFromSave(save);

        if (discoveredOutsideLocations.length === 0 || prisonerActors.length === 0) {
            save.expeditionChoices = [];
            return save.expeditionChoices;
        }

        const selectedLocations = this.takeRandomDistinct(
            discoveredOutsideLocations,
            Math.min(3, discoveredOutsideLocations.length),
        );

        save.expeditionChoices = selectedLocations.map((location, index) => ({
            id: generateUuid(),
            locationId: location.id,
            description: `Expedition to ${location.name}`,
            partnerActorIds: [this.pickRandom(prisonerActors)?.id || ''].filter(id => id !== ''),
        }));

        this.saveGame(); // Save the rough expedition options.

        // Generate distinctive descriptions for each expedition, using context and the LLM:
        this.generator.textGen({
            prompt: generateContext(undefined, this, 5) +
                `\n\nRepeat each of the following three expedition descriptions, but with revised, vivid and compelling one-line descriptions that briefly relate to ongoing plotlines or hint at an intriguing new angle:\n\n` +
                save.expeditionChoices.map(choice => `${choice.id} - ${save.atlas[choice.locationId]?.name || 'unknown location'}: ${choice.description}`).join('\n'),
            min_tokens: 10,
            max_tokens: 500,
            include_history: true
        }).then(response => {
            if (response?.result) {
                const descriptions = response.result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                const currentSave = this.getSave(); // Get the most recent save to ensure we're updating the current one
                for (const choice of currentSave.expeditionChoices || []) {
                    const matchingDescription = descriptions.find(desc => desc.toLowerCase().startsWith(choice.id.toLowerCase()));
                    if (matchingDescription) {
                        choice.description = matchingDescription.substring(choice.id.length).trim();
                    }
                }
            }
        }).catch(err => {
            console.warn('Error generating expedition descriptions', err);
        });

        return save.expeditionChoices;
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
            const potentialInitialActors = Object.values(save.actors).filter(actor => actor.type !== 'PLAYER');
            // Choose one to three random actors.
            skit = new Skit({
                skitType: SkitType.SOCIAL,
                initialLocationId: selectedLocation.id,
                script: [],
                initialActors: this.takeRandomDistinct(potentialInitialActors, Math.min(Math.floor(Math.random() * 3) + 1, potentialInitialActors.length)).map(actor => actor.id),
                summary: '',
            });
        } else {
            // if there's an expedition, the initial actors should be the partner IDs from the expedition:
            const potentialInitialActors = Object.values(save.actors).filter(actor => actor.type !== 'PLAYER' && actor.type !== 'WARDEN');
            const expedition = save.expeditionChoices?.find(choice => choice.locationId === selectedLocation.id);
            const initialActors = expedition ? expedition.partnerActorIds : [this.pickRandom(potentialInitialActors)?.id].filter(Boolean);

            skit = new Skit({
                skitType: SkitType.ADVENTURE,
                initialLocationId: selectedLocation.id,
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

        // This is where various outcomes of the skit would be processed and applied to the save state

        this.rebuildExpeditionChoices(save);

        this.saveGame();
    }

    // Callback to show priority messages in the tooltip bar
    private priorityMessageCallback?: (message: string, icon?: any, durationMs?: number) => void;

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
            const response = await this.generator.removeBackground({image: imageUrl});
            return response?.url ?? imageUrl;
        } catch (error) {
            console.error(`Error removing background`, error);
            return imageUrl;
        }
    }

    async uploadFile(fileName: string, file: File): Promise<string> {
        // Don't honor file's name; want to overwrite existing content that may have had a different actual name.
        const updateResponse = await this.storage.set(fileName, file).forUser();
        if (!updateResponse.data || updateResponse.data.length == 0) {
            throw new Error('Failed to upload file to storage.');
        }
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
                while (Object.keys(actors).length < this.INITIAL_ACTORS) {
                    // Load one random actor from a hardcoded whitelist of fullPaths (SUPPORTED_CHARACTERS); filter out characters that are already in actors
                    console.log('Loading reserve actor from supported characters...');
                    const character = this.pickRandom(SUPPORTED_CHARACTERS.filter(charDef => !Object.values(actors).some(actor => actor.fullPath === charDef.fullPath)));
                    if (!character) {
                        console.warn('No more supported characters to load as reserve actors.');
                        break;
                    } else if (!character.name || !character.fullPath) {
                        continue;
                    }
                    const newActor = await loadSupportedActor(character.name, this);
                    if (newActor) {
                        console.log(`Loaded reserve actor ${newActor.name} from fullPath ${newActor.fullPath}`);
                        this.getSave().actors = {...actors, [newActor.id]: newActor};
                        // Disable character lorebook entry with a name match on newActor:
                        const lore = findBestNameMatch(newActor.name, this.getSave().lorebook || [], 'title');
                        if (lore) {
                            lore.enabled = false;
                        }

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
