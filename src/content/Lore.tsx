type LoreType = "character" | "location" | "other";

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

export type Lore = {
    id: string;
    type: LoreType;
    title: string;
    content: string;
    triggers: string[];
    constant: boolean;
    depth: number;
    priority: number;
}

export async function fetchLorebook() {
    const lorebookQuery = 'https://inference.chub.ai/api/lorebooks/miyo_rin/memoria-world-lore-5ddc2d6a3c0e';

    const response = await fetch(lorebookQuery);
    const item = await response.json();

    console.log('Fetched lorebook item:');
    console.log(item);

}