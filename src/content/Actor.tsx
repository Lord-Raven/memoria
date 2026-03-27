import { v4 as generateUuid } from 'uuid';
import { Emotion, EMOTION_PROMPTS, EmotionPack, EmotionPromptMap } from './Emotion';
import { Stage } from '../Stage';
import { AspectRatio } from '@chub-ai/stages-ts';
import { createImageAssetUrlResolver } from './imageAssetUrl';

const getBaseImage = createImageAssetUrlResolver('characters');

export enum ActorType {
    PLAYER = 'PLAYER', // Primary player, controlled by the user; player is also a prisoner, but treated distinctly
    WARDEN = 'WARDEN', // Cassiel, special role that needs to be treated distinctly
    PRISONER = 'PRISONER', // Most characters

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
    name: string = ''; // Display name
    fullPath: string = ''; // Path to original character definition
    sampleImageUrl: string = ''; // Original reference image
    description: string = ''; // Core physical description—not outfit-oriented
    profile: string = ''; // Personality profile description of character
    outfitId: string = ''; // The ID of the current outfit for this actor; if empty, use the first outfit index
    outfits: Outfit[] = []; // Sets of outfits representing transformations for this actor; each outfit has a full set of emotions
    themeColor: string = ''; // Theme color (hex code)
    themeFontFamily: string = ''; // Font family stack for CSS styling
    voiceId: string = ''; // Voice ID for TTS
    characterArc: string = ''; // A character arc summary that is updated after skits, to better reflect changes or developments in the character's personality, motives, or relationships. This is used to inform future skits and interactions with this character, and can be referenced in the script prompts as well.

    /**
     * Rehydrate an Actor from saved data
     */
    static fromSave(savedActor: any): Actor {
        const actor = Object.create(Actor.prototype);
        Object.assign(actor, savedActor);
        return actor;
    }

    constructor(props: any) {
        Object.assign(this, props);
        if (!this.id) {
            this.id = generateUuid();
        }
    }
}

const DISTILLATION_KEY_MAP: { [key: string]: string } = {
    name: 'name',
    description: 'description',
    profile: 'profile',
    motive: 'motive',
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


// extra space temporarily denotes final path.
export const SUPPORTED_CHARACTERS: Partial<Actor>[] = [
    {
        id: `cassiel`,
        name: 'Cassiel',
        type: ActorType.WARDEN,
        profile: 'A stern and enigmatic warden who oversees the prison. Cassiel is known for their strict rules and mysterious past.',
        sampleImageUrl: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png',
        outfits: [{
            id: 'default',
            description: 'Cassiel, the Warden, is a towering goddess in flowing white robes.',
            name: 'Celestial Robes',
            prompts: {},
            emotionPack: {
                base: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png',
                neutral: 'https://media.charhub.io/3bb73e95-be2a-4f2c-bda7-1314e821eb3b/1641bc16-ede8-492c-b135-e82f019b3bed.png'
            }
        }],
        outfitId: 'default',
        fullPath: '',
        characterArc: '',
        themeColor: '#a6e683',
        themeFontFamily: 'Georgia, serif',
        voiceId: 'calm_female_20s'
    }, /*{
        name: 'Aeriya', 
        fullPath: 'SilverFlame/aeriya-361950a8a9ba', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8118f416-076c-46c0-b6ec-cd162b928e21/58f1442e-3c03-4740-b138-6c100bcc20bf.png'
    }, {
        name: 'Amat-Ea', 
        fullPath: 'adelsvard/amat-ea-18df50a603a5', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6b8ac58-f648-4c87-8d67-3d6c63adefad/527d8308-8594-4254-b4e1-5efde4ad9cc1.png'
    }, */{
        name: ' Arca-7', 
        fullPath: 'NobodyNos/arca-7-tactical-support-brat-8c439a869a73', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/c755a79e-2dbe-4fcb-9aa5-5bae55f11778/f7d4658a-57c2-4390-ba8f-6c8988899667.png',
        outfits: [{
            id: 'default',
            name: "Belt-Cloak Garb",
            description: "A plain, sleeveless white dress that falls to mid-thigh, worn without undergarments or shoes. Detachable black sleeves cover her arms. Over this, she wears a unique hooded cloak made entirely of interwoven, prehensile leather belts that attach at her shoulders, waist, and thighs, forming a functional part of her body.",
            prompts: {},
            emotionPack: {
                joy: "https://media.charhub.io/f5ae4f78-c088-435e-8015-294a843f14f5/5479c4e9-4f2c-4645-be0d-22c162ccdd3f.png",
                base: "https://media.charhub.io/7e8e0308-2310-431e-b70f-8b30c099e3c1/5986ffb6-0a72-47dc-96f2-ac2b5d2aaabc.png",
                fear: "https://media.charhub.io/9c92f9c3-71f4-4ced-a214-14364e06356a/d2a68b62-f920-472c-946b-d4ef2b183bf8.png",
                love: "https://media.charhub.io/151bd529-e0c7-496a-8aed-3b9e7e380b8c/c8c09537-b5b4-4488-8516-5ccb1864c88a.png",
                anger: "https://media.charhub.io/0bcc358f-a0f3-4cee-957d-5b5329d1cd9c/9bdb9c86-b4a7-4664-b3f0-4143fbce7bf6.png",
                grief: "https://media.charhub.io/c3b40c75-2027-45a8-908f-3533570f4322/714d5f21-c088-4e9e-8c2b-6123e8af2d82.png",
                guilt: "https://media.charhub.io/4d8df8d0-56e1-4a86-844f-04ca6e0a81d5/63064781-2c37-4f12-bbf9-389d9947a997.png",
                pride: "https://media.charhub.io/0a6e3cda-d994-4645-953c-0e3e1e7a29b7/060969c2-dcc9-4340-9c30-73b7d09094a3.png",
                desire: "https://media.charhub.io/3ee49259-f101-4d68-858b-114c54c9a359/e22f39bc-8d1d-4288-b566-5f140fdbdf20.png",
                wonder: "https://media.charhub.io/c1c82f3d-60a5-4fc6-8d79-ca06a817ff4f/5a28e82d-df07-4951-8369-b242f30fba35.png",
                disgust: "https://media.charhub.io/fdc13aed-cc7f-4056-9391-c9329f4113cb/90d90c90-8fd1-4ba3-a6c8-0bad8e41387f.png",
                ecstasy: "https://media.charhub.io/62981c89-749c-4219-927a-636eb24950e5/f2639604-d773-4b3b-b370-a1c408f199b4.png",
                neutral: "https://media.charhub.io/0bd25a65-f8ae-4c7e-aaab-fda655495a90/bd0b8150-f695-4228-b0a8-11b9b031d5b9.png",
                sadness: "https://media.charhub.io/36a53dc8-7255-4626-8b8c-f8c52ee9b116/87189cd3-0647-4a36-908f-b46dec681570.png",
                approval: "https://media.charhub.io/f4676138-a40e-4b92-8879-7357eb696f90/c2bac203-48cd-4633-a6de-0b20ef2e12e7.png",
                intrigue: "https://media.charhub.io/025062f1-27ef-4cc1-9f21-fa728649e5ee/64f53197-bbc8-4c69-8b28-a72871cf14c7.png",
                kindness: "https://media.charhub.io/faeae939-718a-4eff-b75d-d2715f3d6cd5/2016ce43-b710-4b0c-a69a-e8d984d80c30.png",
                confusion: "https://media.charhub.io/18884584-66b2-4546-825f-d981e7c472e3/ecd36381-478f-4115-a742-8d8946df4d58.png",
                exhaustion: "https://media.charhub.io/6ac6efd7-21d1-443d-a404-4dab467e3617/10d20ab1-542c-4553-87a9-4bdd57d3dee4.png",
                nervousness: "https://media.charhub.io/332bb85b-608a-4a8f-9748-9028627168d1/b7a29682-841a-46f8-b090-8ffe1f3a37a9.png",
                embarrassment: "https://media.charhub.io/68a257a5-ef71-42c8-aae0-a07b4d6e74dc/913d0853-3829-4dbe-9505-9ec4387083c2.png",
                disappointment: "https://media.charhub.io/ec35c154-699c-4efb-8d34-7e49501fee34/4ac448ff-2ac3-4d20-bba4-f19b06d2966e.png",
                injured: "https://media.charhub.io/d711ecf4-bfa8-4252-8702-43dda284755a/46079bb2-2cad-4653-82a3-7bfa33b17ba8.png"
            }
        }]
    }, /*{
        name: 'Astraea', 
        fullPath: 'SteakedGamer/astraea-1e7f9aeca6e1', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/33805aff-79d6-46ab-bc2c-3eb74b859084/9b010521-17bc-4a68-93a4-38446eafba47.png'
    }, {
        name: 'Caedmon', 
        fullPath: 'Lellan/caedmon-the-brightwork-smith-af9d71cfe8ba', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e6a6deed-e2e1-47a8-a4f6-439a6b011749/d0292798-e93f-4824-87c3-4d5205d99afa.png'
    }, */{ 
        name: 'Elowen', 
        fullPath: 'Richarrd/elowen-bridgewater-f2bfac00b888', 
        profile: 'Calm, controlled, and intellectually precise. She observes and analyzes before speaking in a measured, deliberate tone. Publicly, she is a composed reformist who values systems, efficiency, and moral clarity over sentiment or chaos.',
        characterArc: 'To seize ideological leadership within Ardeia and shape its future direction. She accepts the system but believes it must aim higher than mere survival, and she intends to be the one to guide it there.',
        themeColor: '#2C3E50',
        themeFontFamily: '"Times New Roman", serif',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/4a2fa754-83d7-423b-af96-1154857d6872/c7a6af54-16ed-45db-bbd0-243867d111a3.png',
        outfits: [{
            id: 'default',
            name: 'Tailored Peasant Garb',
            description: 'A tall, fine-boned woman with a severe pale-blonde pixie cut, a thin braid, and glacial blue eyes. Her subtle elfin features are sharp and analytical. She wears tailored, practical peasant clothing in earth tones, everything intentional and devoid of decoration.',
            prompts: {},
            emotionPack: {
                base: 'https://media.charhub.io/70e3344a-6859-425e-97d8-7f1bb34a4378/c7114535-4ca4-415e-8c81-e93641df3bb8.png',
                neutral: 'https://media.charhub.io/054cc56b-3e4e-4078-b5a0-6372356a1fdc/c2aa2ee3-6032-4008-a0bb-914eebaa99f7.png',
                exhaustion: 'https://media.charhub.io/183daf13-12c7-4a52-9b96-08961fc65af5/8d5ad846-cc53-4fdf-aad1-38138648fbc3.png'
            }
        }],
        outfitId: 'default',
    }, { 
        name: 'Lumi', 
        fullPath: 'DarkSkies/lumen-healer-writing-faster-than-she-s-forgetting-9f715a662e32', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/44296727-c09e-46f4-b90e-d49a308777b8/9f020d4a-7990-46b0-ac90-27bf0f0e9939.png',
        outfits: [{
            id: 'default',
            name: `Healer's Gear`,
            description: '',
            prompts: {},
            emotionPack: {
                base: 'https://media.charhub.io/34cef282-aab0-44fd-8d6b-4bf9387174e3/7d419bbe-4ea8-4f06-8a88-613c465d645c.png',
                neutral: 'https://media.charhub.io/19adc43a-f997-4548-ba80-6e0dbf092898/2bd068ac-eb68-4c21-86af-2c3e55fef34b.png',
                joy: 'https://media.charhub.io/30bef416-1660-462d-bc20-cb41ee54ddaf/5746d179-db11-4399-a9e0-afe19d84db0b.png',
                desire: 'https://media.charhub.io/2720745c-0430-4850-bc98-59b88af94b43/62efc531-2ea0-44f4-b8b9-3b40221b2013.png',
            }
        }],
        outfitId: 'default',
    }, {
        name: 'Lyra', 
        fullPath: 'Birb_Brain/lyra-scavenger-stray-survivor-fa0621f65589', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/79b9384b-5a85-4ff9-86b0-0bca7b9a01b3/6d7c9cda-f13e-451a-ac2f-ea17d21c9d83.png',
        outfits: [{
            id: 'default',
            name: 'Scavenger Wear',
            description: 'A lithe woman with brilliant blue eyes and white hair tied up at the back. Her most striking features are a pair of expressive, orange-furred fox ears and a matching fox tail. Her clothing is lightweight, practical, and heavily modified with pockets and pouches',
            prompts: {},
            emotionPack: {
                base: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/cf833ea3-8995-4b54-96cc-01c2efdfde41/362e2787-41f9-42d9-9a03-46031bfc9f67.png',
                neutral: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/cf833ea3-8995-4b54-96cc-01c2efdfde41/362e2787-41f9-42d9-9a03-46031bfc9f67.png'
            }
        }],
        outfitId: 'default',
    }, { 
        name: 'Mallory', 
        fullPath: 'SKU11/mallory-the-supposed-champion-of-a-dead-god-7ceb7a1c461b', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8bbd81d1-29bf-45e0-a653-b86ee33a6a4c/b96f6450-8367-4a8a-9cf7-ea6fdb070e13.png',
        /*outfits: [{
            id: 'default',
            name: 'Deceiver Chic',
            description: 'A tall, lean woman with purplish hair fading to orange tied in twintails with a curtain of bangs. Sharp orange eyes dart behind thin, round glasses—a part of her human disguise, which includes a black capelet and purple vest over a white blouse, with black pants and gloves.',
            emotionPack: {
                base: 'https://media.charhub.io/fef3dde9-48fb-4ba6-9d54-1606b5f5d926/6b38d1f2-9ad9-440b-91e2-d942eee89b17.png',
                neutral: 'https://media.charhub.io/3c039253-29f4-45e5-b145-91c9fc96a56c/f89a8cb2-7d62-42ec-9597-8ad2ef4e6bf9.png',
                approval: 'https://media.charhub.io/4a4d339b-08bf-4c7c-a99b-f4abc4be92b4/5c4d72ad-c8c3-495b-8f3c-6cb12ed61b25.png',
            }

        }],
        outfitId: 'default'*/
    }, /*{ 
        name: 'Mel', 
        fullPath: 'ashen1n/melina-mel-argyra-68a8d1c1c55a', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a02ae02e-b798-4ef5-bd6f-2f26c47593e4/16d1ad89-ae10-43c0-bc16-eaed773849ce.png'
    }, {
        name: 'Millia', 
        fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/b564f9af-0ffe-49fc-aefe-c9c6563688fd/4df9d97d-165c-4c90-aa1b-aa7e8787b14d.png'
    }, {
        name: 'Milliette',
        fullPath: 'Not_Lex/millia-milliette-test-af10f9b806b2',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/adb4022f-290c-44cf-b5eb-9350bbb5d5d4/2a3399c5-77ce-4e18-8087-f8d6a25b68bf.png'
    },*/ {
        name: 'Mira', 
        fullPath: 'Derpnomicon/mira-the-tomboy-mechanic-c77eb7d4c86e', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/39a4bd46-60f0-486e-9127-72470ef82c17/cd3a5df1-96c2-4621-9246-6e0145e990a3.png'
    }, /*{
        name: 'Nadiya', 
        fullPath: 'xsenn/nadiya-18576a12939e', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/612f24c2-3742-4963-8f3e-10afd2193833/1d8a6e1f-cee0-4c40-b49a-e79dba4c64cd.png'
    },*/{ 
        name: 'Persephone', 
        fullPath: 'Sancay/persephone-the-normal-barmaid-a45c371b9af0', 
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a3d2a9e2-3bbc-4814-a985-00211e64ced0/ce59e51e-08c6-499c-9845-8c0644df4c76.png'
    }, {
        name: 'Reitia',
        fullPath: '7leaf/reitia-overwritten-rabbit-30a97d6be1ef',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/37db624a-cf8c-4010-b483-8598b2f9771e/2008acca-2532-4cf0-aca8-8b95e090dcc4.png',
        outfits: [{
            id: 'Utilitarian Jumpsuit',
            name: 'Utilitarian Jumpsuit',
            description: 'A simple, white, skin-tight jumpsuit with brown leather straps. The outfit is functional and devoid of personal flair, chosen for its efficiency.',
            prompts: {},
            emotionPack: {
                base: 'https://avatars.charhub.io/avatars/stages/storage/plain/e537a3cf-94f4-4665-9266-92a243ba67f4.png',
                neutral: 'https://media.charhub.io/1531a486-dd4e-4eb5-b250-6a0adfa673db/bc2f8065-8bfe-40f5-a764-57c26699ad53.png',
                approval: 'https://media.charhub.io/49eb5170-be79-412d-b88c-afda307b12eb/6501c929-08a1-4fcf-baab-80703bc7aad6.png',
                anger: 'https://media.charhub.io/82686830-59df-4c87-991e-a60180a14a8b/21343372-660e-46ce-aa32-e3816fea6f43.png',
                confusion: 'https://media.charhub.io/4286bef1-c77b-4681-bdbb-8e36149eff29/a0a119dd-9442-4cea-9b85-ab2e1684a337.png',
                desire: 'https://media.charhub.io/2012f17f-9701-473e-a8d9-3950e2ec4251/08230106-93cb-4803-b0cd-e542d75e1ed7.png',
                disappointment: 'https://media.charhub.io/a66cc138-233c-40fd-8472-b2ee0013a006/3ecfb28b-0064-41c7-9aff-7332d24e1e27.png',
                disgust: 'https://media.charhub.io/98142cf7-b598-4abb-8e57-d711c912cbb6/8c7059dd-e916-4bac-83af-f008b9d06355.png',
                embarrassment: 'https://media.charhub.io/58351a93-610e-4e18-812d-54f34deddd4d/72ebfd53-1d3a-43b1-9fb0-6b5319cd810a.png',
                ecstasy: 'https://media.charhub.io/194ce6ad-12e9-4eb2-89ae-524435aedce4/f31499fe-c505-4a1a-8ed8-8423961d93a2.png',
                exhaustion: 'https://media.charhub.io/d0861cf4-5488-420a-b782-373922ea6c8d/ff1ae09a-2189-4ca2-838c-e796816af7e4.png',
                fear: 'https://media.charhub.io/62634659-67c3-4f05-991b-48b6ceca6f1e/4bb4471f-8dd6-4f5a-b818-57b15cce0962.png',
                grief: 'https://media.charhub.io/17a9dba1-d513-4ab8-8657-d6f763268070/5929b5d1-ff21-4bde-b99a-79f9a03eb0d0.png',
                guilt: 'https://media.charhub.io/75d92464-ce73-4df4-95a3-cdfe92c10224/f3a7964a-302e-4f57-bf63-21dba576ec5e.png',
                injury: 'https://media.charhub.io/af9161f2-1d3d-4890-ae3d-e07f115c67ef/e4f15454-2f40-41b4-859f-6af815a89486.png',
                intrigue: 'https://media.charhub.io/a85396aa-0fb9-4dc9-9bd0-ea48ea4bc514/853cc474-ea06-45ad-9815-a9b3491abd83.png',
                joy: 'https://media.charhub.io/05530b83-33f7-4c10-8b2f-3e0827194191/71281eb2-835d-49a8-8b2c-f31756546433.png',
                kindness: 'https://media.charhub.io/094a1899-e66e-4560-98c4-eaf90061b440/dedd22d5-fac9-47ee-8d39-7789a34e29a2.png',
                love: 'https://media.charhub.io/ee3db6db-dcb2-4333-b5e5-c4a18a9c531b/e16db2d3-18ec-4b3f-9129-af10db92fe9c.png',
                nervousness: 'https://media.charhub.io/1cea97ee-d4df-4027-808a-d028f856f032/7adc9c7c-1a92-437e-be41-3a571f164c5a.png',
                pride: 'https://media.charhub.io/2563e440-b042-4183-a879-95a14032c074/d94057c7-2ac4-4642-9d8b-3ae8f3d985f6.png',
                sadness: 'https://media.charhub.io/68830a50-117b-4019-9383-3a46885a2aea/aae69ab0-6f88-4962-be93-6cd6e3b5aeb6.png',
                wonder: 'https://media.charhub.io/5d666303-9084-4a00-b656-962bcdb6db5c/b00eaa0e-3c7d-44c2-88e4-68dcc6bb42af.png'
            }
        }]
    }, {
        name: 'Sam',
        fullPath: 'Beastmastaa/the-living-scythe-sam-a97cfbc256a1',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/aad73514-fc09-4241-ac38-851d7033e253/b223f2ae-44e9-4802-a719-5b46099999c4.png',
        outfits: [{
            id: 'default',
            name: 'Scythe Form',
            description: 'A five-foot-long, elegantly curved scythe with a haft of dark, polished wood and a blade of shimmering, silvery metal that seems to drink in the light. The weapon is immaculate and radiates a faint, watchful presence.',
            prompts: {},
            emotionPack: {
                base: 'https://media.charhub.io/b203e2c2-d096-4302-95bc-a7522562e9f7/e4192cf5-bd79-4b9a-9ef6-8a6f603575a8.png',
                neutral: 'https://media.charhub.io/b203e2c2-d096-4302-95bc-a7522562e9f7/e4192cf5-bd79-4b9a-9ef6-8a6f603575a8.png'
            }
        }],
        outfitId: 'default'
    },/* {
        name: 'Soren',
        fullPath: 'Ruranel/soren-rokhe-d7bcedc04e37',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/a772b885-a21f-4d65-80dd-c164e4a163e1/f342e5bb-a80c-4e20-9fdd-0753bf07d7e7.png'
    }, {
        name: 'Thessaly',
        fullPath: 'Forgotten_Stories/thessaly-the-unbidden-8c09bb62bf58',
        sampleImageUrl: ''
    }, {
        name: 'Vash',
        fullPath: 'XxSiCxX/vash-romina-ghosts-of-another-world-735a31a4e894',
        sampleImageUrl: 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/f7504502-57f0-49ef-9178-b4f053c9bb37/e09c6364-4e67-4ccb-b744-c4748316335f.png'
    },*/

];

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

const FULL_IMAGE_WIDTH = 1024;
const FULL_IMAGE_HEIGHT = 1280;
const BASE_IMAGE_WIDTH = 944;
const BASE_IMAGE_HEIGHT = 1180;

async function normalizeBaseSourceImage(imageUrl: string): Promise<string> {
    if (!imageUrl) {
        return imageUrl;
    }

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loadedImage = new Image();
        loadedImage.crossOrigin = 'anonymous';
        loadedImage.onload = () => resolve(loadedImage);
        loadedImage.onerror = () => reject(new Error(`Failed to load base source image: ${imageUrl}`));
        loadedImage.src = imageUrl;
    });

    const contextCanvas = document.createElement('canvas');
    contextCanvas.width = FULL_IMAGE_WIDTH;
    contextCanvas.height = FULL_IMAGE_HEIGHT;

    const context = contextCanvas.getContext('2d');
    if (!context) {
        return imageUrl;
    }

    const scale = Math.min(
        BASE_IMAGE_WIDTH / image.naturalWidth,
        BASE_IMAGE_HEIGHT / image.naturalHeight
    );
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    const imageOffsetX = (BASE_IMAGE_WIDTH - scaledWidth) / 2;
    const imageOffsetY = (BASE_IMAGE_HEIGHT - scaledHeight) / 2;
    const baseOffsetX = (FULL_IMAGE_WIDTH - BASE_IMAGE_WIDTH) / 2;
    const baseOffsetY = FULL_IMAGE_HEIGHT - BASE_IMAGE_HEIGHT;

    context.clearRect(0, 0, FULL_IMAGE_WIDTH, FULL_IMAGE_HEIGHT);
    context.drawImage(
        image,
        baseOffsetX + imageOffsetX,
        baseOffsetY + imageOffsetY,
        scaledWidth,
        scaledHeight
    );

    return contextCanvas.toDataURL('image/png');
}

export async function loadSupportedActor(name: string, stage: Stage): Promise<Actor|null> {
    // Canon data within the stage:
    const newActor = new Actor(SUPPORTED_CHARACTERS.find(char => char.name === name));

    // Retrieve data from Chub to fill in possible gaps:
    let definition: any = null;
    try {
        if (newActor.fullPath) {
            const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', newActor.fullPath));
            definition = (await response.json()).node.definition;
        }
    } catch (error) {
        console.warn(`Failed to fetch character details for ${name} at path ${newActor.fullPath}:`, error);
    }

    if (definition) {
        console.log(`Loaded character definition for ${name} from Chub:`);
        console.log(definition);
        // Even if nothing else, use the definition voice ID over whatever is in the stage.
        if (definition.voice_id && !VOICE_MAP[definition.voice_id]) {
            newActor.voiceId = definition.voice_id;
        }

        // if newActor is missing critical fields like personality or outfits, distill these details to fill the gaps
        if (!newActor.profile || !newActor.outfits) {
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
            `PROFILE: A brief summary of the character's personality traits, mannerisms, and public persona. Focus on what others would notice immediately about them.\n` +
            `MOTIVE: The character's hidden agenda, underlying emotional drive, or what they hope to achieve here. This may align with or differ from their profile. Keep it concise but revealing of their true intentions.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender (foremost) and personality.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A font stack, or font family that reflects the character's personality; this will be embedded in a CSS font-family property.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She rarely smiles, but when she does, it lights up her face.\n` +
            `OUTFIT DESCRIPTION: She wears a simple, utilitarian outfit made from durable materials in dark colors. Lots of pockets and zippers.\n` +
            `OUTFIT NAME: Adventurer's Gear\n` +
            `PROFILE: Jane is confident and determined, quick-witted, and fiercely independent. Known for her sharp wit and strong presence, she has a commanding aura that draws attention.\n` +
            `MOTIVE: Deep down, Jane is driven by a need to prove she's worthy of love despite her past betrayals. She's here looking for someone who will challenge her and see beyond her tough exterior.\n` +
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
    actor.characterArc = actor.characterArc || parsedData['motive'] || '';
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
        `The prompt is intended to describe the target mood by visually describing this character's expression, posture, gesture, ` +
        `and demeanor in a way that takes their style, personality, and outfit into account where appropriate. ` +
        `Output only the final prompt text and then #END#\n\n` +
        `Example response:\n` +
        `This character is now in a flirty, playful mood. She smiles and leans forward slightly, with a glint in her half-lidded eyes. She blushes and plays with her hair.\n#END#`;
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
                prompt: `Illustrate this character in a rough, messy, anime-inspired concept-art style with thick brush strokes. ` +
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
	return findBestNameMatch(actorName, stage.getSave().lorebook?.filter(lore => lore.type === 'character') ?? [], 'title');
}

export function getActorProfile(actorId: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return '';
	}

	const lore = getLinkedActorLore(actor.name, stage);
	return lore?.content ?? actor.profile;
}

export function updateActorProfile(actorId: string, profile: string, stage: Stage) {
	const actor = stage.getSave().actors[actorId];
	if (!actor) {
		return;
	}

	const lore = getLinkedActorLore(actor.name, stage);
	if (lore) {
		lore.content = profile;
		return;
	}

	actor.profile = profile;
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
    const names = name.split(' ');
    
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
 * @returns The best matching candidate, or null if no good match is found
 */
export function findBestNameMatch<T extends Record<K, string>, K extends string = 'name'>(
    searchName: string,
    candidates: T[],
    nameProperty: K = 'name' as K
): T | null {
    if (!searchName || candidates.length === 0) {
        return null;
    }

    let bestMatch: T | null = null;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const candidate of candidates) {
        const score = getNameSimilarity(candidate[nameProperty], searchName);
        // Only consider matches above threshold
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}