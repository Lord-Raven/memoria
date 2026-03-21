import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, User, Character} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, ActorType, loadReserveActorFromFullPath, WHITELISTED_FULLPATHS } from "./content/Actor";
import { Item } from "./content/Item";
import { generateContext, Skit, SkitType } from "./content/Skit";
import { createDefaultAtlas, Location } from "./content/Location";
import { BaseScreen } from "./screens/BaseScreen";
import { v4 as generateUuid } from 'uuid';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = {
    saves: (SaveType | undefined)[]
    lastSaveSlot: number
};

type SaveType = {
    playerId: string;
    actors: {[key: string]: Actor};
    atlas: {[key: string]: Location};
    inventory: Item[];
    timeline: TimelineEntry[];
    turn: number;
    timestamp: number; // Time of last save
    textToSpeech?: boolean;
    language?: string;
    lorebook?: LorebookEntry[]
    expeditionChoices?: ExpeditionChoice[]
}

type ExpeditionChoice = {
    id: string;
    locationId: string;
    description: string;
    partnerActorId: string;
}

type LorebookEntry = {
    id: string;
    title: string;
    content: string;
    triggers: string[];
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

    readonly INITIAL_ACTORS = 3;

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
                    avatarImageUrl: '', // Unneeded; the player is never seen.
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
        // Get empty save slot or replace the oldest save if all slots are full
        const emptySlotIndex = this.saveData.saves.findIndex(save => save === undefined);
        const saveSlotIndex = emptySlotIndex !== -1 ? emptySlotIndex : (this.saveData.lastSaveSlot + 1) % this.SAVE_SLOT_COUNT;

        // Create new save data structure
        const newSave: SaveType = this.generateFreshSave(playerData);

        // Create Cassiel as the Warden and add to actors
        newSave.actors[`cassiel`] = {
            id: `cassiel`,
            name: 'Cassiel',
            type: ActorType.WARDEN,
            profile: 'A stern and enigmatic warden who oversees the prison. Cassiel is known for their strict rules and mysterious past.',
            avatarImageUrl: '',
            appearances: [{
                id: 'default',
                description: 'Default appearance of Cassiel, the Warden.',
                name: 'Default',
                emotionPack: {
                    neutral: ''
                }
            }],
            appearanceId: '',
            fullPath: '',
            characterArc: '',
            themeColor: '#8b0000',
            themeFontFamily: 'Georgia, serif',
            voiceId: ''
        };

        this.anticipatedLoadingPromiseCount = Math.max(this.INITIAL_ACTORS - Object.keys(newSave.actors).length, 0) * 3 + 1;

        // Save the new game
        this.saveData.saves[saveSlotIndex] = newSave;
        this.saveData.lastSaveSlot = saveSlotIndex;

        // Generate a few initial characters.
        this.loadActors().finally(() => {
            this.rebuildExpeditionChoices(newSave);
            this.saveGame();
        });
        
        this.saveGame();
    }

    saveGame() {
        this.messenger.updateChatState(this.saveData);
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
            partnerActorId: this.pickRandom(prisonerActors)?.id || '',
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

        const isArdeia = this.isArdeiaLocationId(selectedLocation.id);

        const skitType = isArdeia ? SkitType.SOCIAL : SkitType.ADVENTURE;

        // Initial actor should be a random non-warden, non-player. Filter player and warden (if not Ardeia), then pick randomly from the remaining actors as the initial actor for the skit:
        const potentialInitialActors = Object.values(save.actors).filter(actor => actor.type !== 'PLAYER' && (isArdeia || actor.type !== 'WARDEN'));
        const initialActor = this.pickRandom(potentialInitialActors) || undefined;
        const skit = new Skit({
            skitType,
            initialLocationId: selectedLocation.id,
            script: [],
            initialActors: [initialActor?.id].filter(Boolean),
            summary: '',
        });

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
        if (imageToImageRequest.remove_background && imageUrl != defaultUrl) {
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

    async loadActors() {
        if (Object.keys(this.generationPromises).includes('loadActors')) {
            return this.generationPromises['loadActors'];
        }

        const promise = new Promise<string>(async () => {
            try {
                console.log(`Loading reserve actors...${Object.keys(this.getSave().actors || {}).length}`);
                console.log(this.getSave().actors);
                let actors = this.getSave().actors || {};
                while (Object.keys(actors).length < this.INITIAL_ACTORS) {
                    // Populate reserve actors; this is loaded with data from a service, calling the characterServiceQuery URL:
                    /*const exclusions = (this.getSave().bannedTags || []).concat(this.bannedTagsDefault).map(tag => encodeURIComponent(tag)).join('%2C');
                    const response = await fetch(this.characterSearchQuery
                        .replace('{{PAGE_NUMBER}}', '1')
                        .replace('{{EXCLUSIONS}}', exclusions ? exclusions + '%2C' : '')
                        .replace('{{SEARCH_TAGS}}', ['female'].concat(['woman']).join('%2C')));
                    const searchResults = await response.json();
                    console.log(searchResults);
                    // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
                    const basicCharacterData = searchResults.data?.nodes.filter((item: string, index: number) => index < this.INITIAL_ACTORS - Object.keys(actors).length).map((item: any) => item.fullPath) || [];
                    if (searchResults.data?.nodes.length === 0) {
                        console.warn('No more characters found from search results; resetting page number to 1 to retry with the same parameters.');
                        this.actorPageNumber = 1;
                    } else {
                        this.actorPageNumber = (this.actorPageNumber % this.MAX_PAGES) + 1;
                    }
                    console.log(basicCharacterData);

                    const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
                        return loadReserveActorFromFullPath(fullPath, this);
                    }));

                    this.getSave().actors = {...actors, ...Object.fromEntries(newActors.filter(a => a !== null).map(a => [a!.id, a!]))};
                    actors = this.getSave().actors || {};*/

                    // Instead, load one random actor from a hardcoded whitelist of fullPaths
                    console.log('Loading reserve actor from whitelist...');
                    const fullPath = WHITELISTED_FULLPATHS[Math.floor(Math.random() * WHITELISTED_FULLPATHS.length)];
                    const newActor = await loadReserveActorFromFullPath(fullPath, this);
                    if (newActor) {
                        console.log(`Loaded reserve actor ${newActor.name} from fullPath ${fullPath}`);
                        this.getSave().actors = {...actors, [newActor.id]: newActor};
                        actors = this.getSave().actors || {};
                    } else {
                        console.warn(`Failed to load actor from fullPath ${fullPath}`);
                    }
                }
                console.log('Finished loading reserve actors');
                delete this.generationPromises['loadActors'];
                this.saveGame();
            } catch (err) {
                console.error('Error loading reserve actors', err);
                delete this.generationPromises['loadActors'];
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
