import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, User, Character} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, ActorType } from "./content/Actor";
import { Item } from "./content/Item";
import { Skit } from "./content/Skit";
import { Location } from "./content/Location";
import { BaseScreen } from "./screens/BaseScreen";
import { createDefaultAtlas } from "./screens/MapScreen";

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


    saveData: ChatStateType;
    currentSkit: Skit | null = null;
    primaryUser: User;
    primaryCharacter: Character;
    betaMode: boolean;
    imageGenerationPromises: {[key: string]: Promise<string|void>} = {};

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
        return {playerId: this.primaryCharacter.anonymizedId,
            actors: {
                [this.primaryCharacter.anonymizedId]: {
                    id: this.primaryCharacter.anonymizedId,
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
            appearances: [],
            appearanceId: '',
            fullPath: '',
            characterArc: '',
            themeColor: '#8b0000',
            themeFontFamily: 'Georgia, serif',
            voiceId: ''
        };

        // Generate a few initial characters. Use the 

        // Save the new game
        this.saveData.saves[saveSlotIndex] = newSave;
        this.saveData.lastSaveSlot = saveSlotIndex;
        this.saveGame();
    }

    saveGame() {
        this.messenger.updateChatState(this.saveData);
    }

    getSave(): SaveType {
        return this.saveData.saves[this.saveData.lastSaveSlot] || this.generateFreshSave({name: this.primaryCharacter.name, personality: this.primaryCharacter.personality});
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
        return this.currentSkit;
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

    isVerticalLayout(): boolean {
        // Determine if the layout should be vertical based on window aspect ratio
        // Vertical layout when height > width (portrait orientation)
        return window.innerHeight > window.innerWidth;
    }

    render(): ReactElement {
        return <BaseScreen stage={() => this}/>;
    }

}
