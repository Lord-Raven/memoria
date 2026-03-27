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
    exhaustion = 'exhaustion',
    fear = 'fear', // surprised (unpleasant)
    grief = 'grief',
    guilt = 'guilt', // remorse
    injury = 'injury',
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
//  focus = 

export const EMOTION_SYNONYMS: {[key in Emotion]: string[]} = {
    neutral: ['calm', 'placid', 'serene', 'tranquil', 'stoic', 'neutrality', 'composed', 'composure', 'unemotional', 'impassive', 'impassivity', 'detached', 'detachment',
        'indifferent', 'indifference', 'apathy', 'dispassionate', 'dispassion', 'unaffected', 'unaffectedness', 'resignation', 'resigned'],
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
    exhaustion: ['exhausted', 'tired', 'weary', 'fatigued', 'drained', 'burned out', 'burnt out', 'worn out', 'sleepy', 'sleepiness', 'exhaustion', 'fatigue', 'weariness', 'sapped', 'enervation', 'enervated'],
    fear: ['shocked', 'terrified', 'terror', 'panic', 'alarm', 'alarmed', 'frightened', 'horror', 'horrified', 'shock'],
    grief: ['sad', 'upset', 'depressed', 'depression', 'sobbing', 'desperation', 'sorrow', 'despair'],
    guilt: ['remorseful', 'remorse', 'repentant', 'regretful', 'regretting', 'guiltridden', 'penitent', 'penitence', 'concern'],
    injury: ['injured', 'wounded', 'hurt', 'pain', 'pained', 'injury', 'wound', 'harmed', 'bruised', 'shaken'],
    intrigue: ['intrigued', 'curious', 'curiosity', 'interest', 'absorbed', 'absorbing', 'engrossed', 'engrossing', 'mischief', 'mischievous', 'mischievousness'],
    joy: ['happy', 'happiness', 'joyfulness', 'thrilled', 'delighted', 'elated', 'jubilant', 'elation', 'humor', 'playfulness', 'playful', 'fun', 'delight', 'enthusiasm', 'pleasure',
        'cheer', 'cheery', 'jovial', 'joviality', 'wry humor', 'wry', 'humor', 'humorous', 'glee', 'gleeful'],
    kindness: ['grateful', 'caring', 'thankful', 'sweet', 'affectionate', 'tenderness', 'care', 'fondness', 'warmth', 'trust', 'compassion', 'compassionate', 'encouragement', 'encouraging'],
    love: ['lovestruck', 'adoration', 'adoring', 'devotion', 'devoted', 'infatuated', 'infatuation', 'romantic', 'romance', 'affection', 'affectionate'],
    nervousness: ['anxious', 'uncertain', 'jittery', 'uneasy', 'unease', 'worry', 'worrying', 'vulnerability', 'vulnerable', 'hesitance', 'anxiety', 'caution', 'apprehension'],
    pride: ['proud', 'pridefulness', 'challenge', 'arrogance', 'arrogant', 'self-confidence', 'triumph', 'triumphant', 'confidence', 'confident', 'ego', 'egotism', 
        'egotistical', 'smug', 'smugness', 'determination', 'determined', 'collected', 'cool', 'composed', 'composure', 'focus'],
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
    neutral: 'a typical expression and pose for this character',
    approval: 'approving or pleased',
    anger: 'markedly aggravated or hostile',
    confusion: 'stunned, baffled, or perplexed',
    desire: 'coy, flirty, or overtly alluring',
    disappointment: 'unhappy, annoyed, or deflated',
    disgust: 'disgusted, grossed-out, or repulsed',
    embarrassment: 'embarrassed, awkward, or self-conscious',
    ecstasy: 'euphoric, orgasmic, or inappropriately lusty',
    exhaustion: 'exhausted, weary, or slumped',
    fear: 'shocked, terrified, or defensive',
    grief: 'extremely distressed, sobbing, or mournful',
    guilt: 'remorseful, apologetic, or contrite',
    injury: 'pained, hurt, or bruised',
    intrigue: 'curious, intrigued, or attentive',
    joy: 'happy, smiling, or joyful',
    kindness: 'kind, grateful, or caring',
    love: 'adoring, lovestruck, or affectionate',
    nervousness: 'anxious, uncertain, or uneasy',
    pride: 'proud, confident, or triumphant',
    sadness: 'sad, upset, or dejected',
    wonder: 'inspired, wondrous, or amazed',
};

export type EmotionPack = {[key: string]: string};
