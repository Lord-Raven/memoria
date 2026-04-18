type LoreType = "character" | "location" | "other" | string;
import { v4 as generateUuid } from 'uuid';

// Hard-coding entry names to type for character and location:
const TYPE_MAPPING: Record<LoreType, string[]> = {
    character: ["Cassiel", "Cass", "Halvola",
        "Thessaly Argyra", "Dorothy Nalaresno", "Dolus Perniciosus", "Axo", "Amat-Ea", "Caedmon Brightwork", "Mira",
        "Arca-7", "AL1-C3", "X01E", "Lyra", "Persephone", "Reitia", "Soren Rokhe", "Astraea", "Sam", "Lumen Halas",
        "Nadiya", "Amara", "Melina Argyra", "Rattle", "Millia & Milliette", /*"Milliana",*/ "Haylon", "Keri",
        "Jeanette Beausoleil", "Cyanea", "Aeriya", "Tawamure Rei" 
    ],
    location: ["Ardeia", "The Temple", "The Plaza", "The Library", "The Gardens", "The Clock Tower", "The Names", 
        "The Amber Drop", "Mel's Pit", "Yarrow Rest", "7Loaves", "Mira's Miracle Metalworks", "Brightwork Forge",
        "The Pilgrimage", "The Loom", "Slumbering Orchard", "Blind Spire", "Bleached Earth", "The Threshold",
        "Sunken Core", "The Cradle", "The Shells", ""],
    
    other: [], // Everything else ends up being assigned to this by default.
}

export const MAX_ENTRIES = 30; // Maximum number of lore entries to add to context; if there are more, we'll prioritize based on priority and probability.

export type Lore = {
    id: string;
    type: LoreType;
    title: string;
    content: string;
    triggers: string[];
    enabled: boolean;
    constant: boolean;
    scanDepth: number; // default to 10
    insertionOrder: number;
    priority: number;
    probability: number; // 1 to 100
}

export function createLoreEntry(params: Partial<Omit<Lore, 'id'>>): Lore {
    return {
        type: "other",
        title: "",
        content: "",
        triggers: [],
        enabled: true,
        constant: false,
        scanDepth: 10,
        insertionOrder: 0,
        priority: 0,
        probability: 100,
        ...params,
        id: generateUuid()
    };
}

export async function fetchLorebook() {
    const lorebookQuery = 'https://inference.chub.ai/api/lorebooks/miyo_rin/memoria-world-lore-5ddc2d6a3c0e?full=true';

    const response = await fetch(lorebookQuery);
    const item = await response.json();

    // Convert the fetched data into an array of Lore objects:
    const loreEntries: Lore[] = item.node.definition.embedded_lorebook.entries.map((entry: any, index: number) => {
        // Determine the type based on the title and the TYPE_MAPPING:
        let type: LoreType = "other"; // default to "other"
        for (const [key, names] of Object.entries(TYPE_MAPPING)) {
            if (names.includes(entry.name)) {
                type = key as LoreType;
                break;
            }
        }

        return createLoreEntry({
            type,
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


    console.log('Fetched and parsed lorebook:');
    console.log(loreEntries);
    return loreEntries;

}