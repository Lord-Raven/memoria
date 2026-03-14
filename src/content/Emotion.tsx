export enum Emotion {
    neutral = 'neutral',
    approval = 'approval', // admiration, amusement
    anger = 'anger',
    confusion = 'confusion',
    desire = 'desire',
    disappointment = 'disappointment', // annoyance, disapproval
    disgust = 'disgust',
    embarrassment = 'embarrassment',
    ecstasy = 'ecstasy',
    fear = 'fear', // surprised (unpleasant)
    grief = 'grief',
    guilt = 'guilt', // remorse
    intrigue = 'intrigue', // curiosity
    joy = 'joy',
    kindness = 'kindness', // caring, gratitude
    love = 'love',
    nervousness = 'nervousness',
    pride = 'pride',
    sadness = 'sadness',
    wonder = 'wonder', // realization, optimism, excitement, surprised (pleasant)
}

// Map these emotions to base emotions
//  

export const EMOTION_SYNONYMS: {[key in Emotion]: string[]} = {
    neutral: ['calm', 'placid', 'serene', 'tranquil', 'stoic', 'neutrality', 'composed', 'composure', 'unemotional', 'impassive', 'impassivity'],
    approval: ['content', 'amusement', 'pleased', 'appreciative', 'appreciation', 'satisfaction', 'satisfied', 'enjoyment', 'enjoying', 'content', 
        'contentedness', 'contentment', 'cheerfulness', 'cheerful'],
    anger: ['angry', 'furious', 'fury', 'enraged', 'livid', 'wrath', 'wrathful', 'frustration', 'ire', 'rage'],
    confusion: ['confused', 'puzzled', 'baffled', 'stunned', 'confounded', 'perplexed', 'bewilderment', 'perplexity'],
    desire: ['seductive', 'sexy', 'desirous', 'longing', 'lust', 'yearning', 'passion', 'passionate'],
    disappointment: ['annoyed', 'disapproval', 'dismayed', 'suspicious', 'suspicion', 'distrust', 'resentment', 'defensiveness', 'mockery', 'mocking', 'skepticism', 'disbelief'],
    disgust: ['disgusted', 'grossed_out', 'sickened', 'grossed out', 'sick', 'revulsion', 'disdain', 'contempt', 'rivulsion'],
    embarrassment: ['embarrassed', 'shame', 'ashamed', 'sheepish', 'chagrin', 'mortification', 'abashment', 'selfconsciousness', 'self-consciousness', 'shy', 'shyness', 
        'bashfulness', 'bashful', 'flustered', 'fluster', 'awkwardness', 'awkward', 'discomfiture', 'discomfited', 'discomfort'],
    ecstasy: ['ecstasy', 'ecstatic', 'orgasm', 'orgasmic', 'finishing', 'coming', 'euphoria', 'euphoric', 'mania', 'manic'],
    fear: ['shocked', 'terrified', 'terror', 'panic', 'alarm', 'alarmed', 'frightened', 'horror', 'horrified', 'shock'],
    grief: ['sad', 'upset', 'depressed', 'depression', 'sobbing', 'desperation', 'sorrow', 'despair'],
    guilt: ['remorseful', 'remorse', 'repentant', 'regretful', 'regretting', 'guiltridden', 'penitent', 'penitence', 'concern'],
    intrigue: ['intrigued', 'curious', 'curiosity', 'interest', 'absorbed', 'absorbing', 'engrossed', 'engrossing', 'mischief', 'mischievous', 'mischievousness'],
    joy: ['happy', 'happiness', 'joyfulness', 'thrilled', 'delighted', 'elated', 'jubilant', 'elation', 'humor', 'playfulness', 'playful', 'fun', 'delight', 'enthusiasm', 'pleasure',
        'cheer', 'cheery', 'jovial', 'joviality', 'wry humor', 'wry', 'humor', 'humorous', 'glee', 'gleeful'],
    kindness: ['grateful', 'caring', 'thankful', 'sweet', 'affectionate', 'tenderness', 'care', 'fondness', 'warmth', 'trust', 'compassion', 'compassionate', 'encouragement', 'encouraging'],
    love: ['lovestruck', 'adoration', 'adoring', 'devotion', 'devoted', 'infatuated', 'infatuation', 'romantic', 'romance', 'affection', 'affectionate'],
    nervousness: ['anxious', 'uncertain', 'jittery', 'uneasy', 'unease', 'worry', 'worrying', 'vulnerability', 'vulnerable', 'hesitance', 'anxiety', 'caution', 'apprehension'],
    pride: ['proud', 'pridefulness', 'challenge', 'arrogance', 'arrogant', 'self-confidence', 'triumph', 'triumphant', 'confidence', 'confident', 'ego', 'egotism', 
        'egotistical', 'smug', 'smugness', 'determination', 'determined'],
    sadness: ['sad', 'upset', 'distress', 'sorrow', 'unhappiness', 'melancholy', 'gloom', 'dejection'],
    wonder: ['excited', 'optimistic', 'surprised', 'surprise', 'realization', 'excitement', 'relief', 'hope', 'fascinated', 'fascination', 'awe', 'awe-struck',
        'amazement', 'amazed', 'inspired', 'inspiration', 'anticipation', 'admiration', 'reverence'],
}

// Mapping from synonym to Emotion, built from EMOTION_SYNONYMS
export const EMOTION_MAPPING: {[key: string]: Emotion} = Object.entries(EMOTION_SYNONYMS).reduce((acc, [emotion, synonyms]) => {
    synonyms.forEach((synonym) => {
        acc[synonym] = emotion as Emotion;
    });
    return acc;
}, {} as {[key: string]: Emotion});

export type EmotionPromptMap = {[emotion in Emotion]: string};

// Full image-edit prompt used by Actor.generateEmotionImage.
export const EMOTION_PROMPTS: EmotionPromptMap = {
    neutral: 'Give this character a typical, neutral expression and pose.',
    approval: 'Give this character an approving, pleased expression or gesture.',
    anger: 'Give this character an angry expression and hostile gesture or pose.',
    confusion: 'Give this character a stunned, confused expression and uncertain gesture or pose.',
    desire: 'Give this character a blushing, coy expression and flirty, alluring pose.',
    disappointment: 'Give this character an unhappy, annoyed expression and deflated pose.',
    disgust: 'Give this character a disgusted, grossed-out expression and repulsed gesture or pose.',
    embarrassment: 'Give this character an embarrassed expression and awkward gesture or pose.',
    ecstasy: 'Give this character a euphoric expression, eyes rolled back slightly, with an orgasmic, lusty pose.',
    fear: 'Give this character a shocked, terrified expression and defensive or cowering pose.',
    grief: 'Give this character a depressed, sobbing expression and mournful pose.',
    guilt: 'Give this character a remorseful, apologetic expression and diminished, contrite pose.',
    intrigue: 'Give this character a curious, intrigued expression and attentive pose.',
    joy: 'Give this character a happy, smiling expression and joyful, playful gesture or pose.',
    kindness: 'Give this character a kind, grateful expression and caring gesture or pose.',
    love: 'Give this character an adoring, lovestruck expression and affectionate gesture or pose.',
    nervousness: 'Give this character an anxious, uncertain expression and uneasy gesture or pose.',
    pride: 'Give this character a proud expression and confident, triumphant pose.',
    sadness: 'Give this character a sad, upset expression and dejected pose.',
    wonder: 'Give this character an inspired, wondrous expression and amazed or excited gesture or pose.',
};

export function getDefaultEmotionPromptMap(): EmotionPromptMap {
    return { ...EMOTION_PROMPTS };
}

export type EmotionPack = {[key: string]: string};
