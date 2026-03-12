export enum Emotion {
    neutral = 'neutral',
    admiration = 'admiration',
    amusement = 'amusement',
    anger = 'anger',
    annoyance = 'annoyance',
    approval = 'approval',
    caring = 'caring',
    confusion = 'confusion',
    curiosity = 'curiosity',
    desire = 'desire',
    disappointment = 'disappointment',
    disapproval = 'disapproval',
    disgust = 'disgust',
    embarrassment = 'embarrassment',
    excitement = 'excitement',
    fear = 'fear',
    gratitude = 'gratitude',
    grief = 'grief',
    joy = 'joy',
    love = 'love',
    nervousness = 'nervousness',
    optimism = 'optimism',
    pride = 'pride',
    realization = 'realization',
    relief = 'relief',
    remorse = 'remorse',
    sadness = 'sadness',
    surprise = 'surprise'
}

// Map these emotions to base emotions

export const EMOTION_SYNONYMS: {[key in Emotion]: string[]} = {
    neutral: ['calm', 'placid', 'serene', 'tranquil', 'stoic', 'neutrality', 'composed', 'composure', 'unemotional', 'impassive', 'impassivity', 'indifferent', 'indifference'],
    admiration: ['admire', 'admiring', 'respect', 'respectful', 'esteem', 'esteemed', 'reverence', 'revere', 'regard', 'veneration', 'awe', 'impressed'],
    amusement: ['amused', 'entertained', 'entertainment', 'humor', 'humorous', 'jovial', 'joviality', 'playfulness', 'playful', 'funny', 'witty', 'wittiness', 'lighthearted', 'comical', 'mischief', 'mischievous'],
    anger: ['angry', 'furious', 'fury', 'enraged', 'livid', 'wrath', 'wrathful', 'ire', 'rage', 'mad', 'outraged', 'irate', 'hostile', 'hostility'],
    annoyance: ['annoyed', 'irritated', 'irritation', 'frustrated', 'frustration', 'exasperated', 'exasperation', 'vexed', 'aggravated', 'aggravation', 'peeved', 'miffed',
         'irked', 'indignation', 'indignant', 'impatience', 'impatient', 'bothered'],
    approval: ['pleased', 'satisfaction', 'satisfied', 'enjoyment', 'enjoying', 'content', 'contentedness', 'contentment', 'cheerfulness', 'cheerful', 'favorable', 'acceptance', 'accepting'],
    caring: ['compassionate', 'compassion', 'kindness', 'kind', 'considerate', 'consideration', 'sympathy', 'sympathetic', 'empathy', 'empathetic', 'tender', 'tenderness', 'gentle', 'nurturing', 'supportive', 'support', 'warmth'],
    confusion: ['confused', 'perplexed', 'bewildered', 'puzzled', 'baffled', 'uncertain', 'uncertainty', 'disoriented', 'disorientation', 'mystified', 'befuddled'],
    curiosity: ['curious', 'inquisitive', 'inquiring', 'interest', 'interested', 'intrigued', 'intrigue', 'wonder', 'wondering', 'inquiring mind', 'fascinated', 'fascination', 'engaged'],
    desire: ['seductive', 'sexy', 'desirous', 'longing', 'lust', 'lustful', 'yearning', 'craving', 'wanting', 'covetous'],
    disappointment: ['disappointed', 'dismayed', 'let down', 'letdown', 'disheartened', 'disillusionment', 'disillusioned', 'deflated', 'unfulfilled', 'dissatisfied', 'dissatisfaction'],
    disapproval: ['disapproving', 'disdain', 'disdainful', 'scorn', 'scornful', 'contempt', 'contemptuous', 'derision', 'derisive', 'criticism', 'critical', 'disapproving', 'suspicious', 'suspicion', 'distrust', 'distrustful', 'skeptical', 'cynical'],
    disgust: ['disgusted', 'grossed out', 'grossed_out', 'sickened', 'sick', 'revulsion', 'revolted', 'repulsed', 'repulsion', 'nauseated', 'nauseous', 'loathing'],
    embarrassment: ['embarrassed', 'shame', 'ashamed', 'sheepish', 'chagrin', 'mortification', 'mortified', 'abashment', 'self-consciousness', 'selfconsciousness', 'shy', 'shyness', 'bashfulness', 'bashful', 'flustered', 'fluster', 'awkwardness', 'awkward', 'discomfiture', 'discomfited', 'discomfort', 'humiliated', 'humiliation'],
    excitement: ['excited', 'exhilarated', 'exhilaration', 'elated', 'elation', 'eager', 'eagerness', 'enthusiastic', 'enthusiasm', 'thrilled', 'ecstatic', 'animated', 'energized', 'zealous', 'zeal'],
    fear: ['afraid', 'scared', 'fearful', 'terrified', 'terror', 'panic', 'panicked', 'alarm', 'alarmed', 'frightened', 'fright', 'horror', 'horrified', 'dread', 'dreading', 'petrified', 'anxious'],
    gratitude: ['grateful', 'thankful', 'thanks', 'appreciative', 'appreciation', 'thankfulness', 'obliged', 'indebted', 'blessed'],
    grief: ['grieving', 'bereaved', 'heartbroken', 'heartbreak', 'devastated', 'devastation', 'anguish', 'anguished', 'depressed', 'depression', 'sobbing', 'desperation', 'despair', 'despairing', 'desolate', 'desolation', 'mourning'],
    joy: ['happy', 'happiness', 'joyful', 'joyfulness', 'delighted', 'delight', 'jubilant', 'jubilation', 'overjoyed', 'fun', 'pleasure', 'pleased', 'cheer', 'cheerful', 'cheery', 'merry', 'merriment', 'blissful', 'bliss', 'glee', 'gleeful'],
    love: ['loving', 'lovestruck', 'adoration', 'adoring', 'devotion', 'devoted', 'infatuated', 'infatuation', 'romantic', 'romance', 'affection', 'affectionate', 'enamored', 'fond', 'fondness', 'passionate', 'passion', 'ecstasy', 'orgasm'],
    nervousness: ['nervous', 'anxious', 'anxiety', 'jittery', 'uneasy', 'unease', 'worry', 'worried', 'worrying', 'vulnerability', 'vulnerable', 'hesitant', 'hesitance', 'caution', 'cautious', 'apprehension', 'apprehensive', 'tense', 'tension', 'edgy'],
    optimism: ['optimistic', 'hopeful', 'hope', 'encouraged', 'encouraging', 'encouragement', 'positive', 'positivity', 'upbeat', 'sanguine', 'buoyant', 'bright-eyed', 'bright eyed', 'expectant'],
    pride: ['proud', 'pridefulness', 'arrogance', 'arrogant', 'self-confidence', 'triumph', 'triumphant', 'confidence', 'confident', 'ego', 'egotism', 'egotistical', 'smug', 'smugness', 'haughty', 'boastful', 'boasting', 'vain', 'vanity'],
    realization: ['realized', 'understood', 'comprehended', 'grasped', 'awareness', 'aware', 'insight', 'insightful', 'enlightened', 'enlightenment', 'epiphany', 'recognition', 'discovered', 'discovery'],
    relief: ['relieved', 'comfort', 'comforted', 'reassured', 'reassurance', 'ease', 'eased', 'soothed', 'soothing', 'alleviated', 'alleviation', 'relaxed', 'relaxation'],
    remorse: ['remorseful', 'regretful', 'regret', 'guilt', 'guilty', 'contrite', 'contrition', 'penitent', 'penitence', 'repentant', 'repentance', 'apologetic', 'sorry'],
    sadness: ['sad', 'unhappy', 'unhappiness', 'upset', 'distress', 'distressed', 'sorrow', 'sorrowful', 'melancholy', 'melancholic', 'gloom', 'gloomy', 'dejection', 'dejected', 'downcast', 'down', 'blue', 'dismal', 'morose'],
    surprise: ['surprised', 'astonished', 'astonishment', 'amazed', 'amazement', 'astounded', 'startled', 'shocked', 'shock', 'stunned', 'flabbergasted', 'dumbfounded', 'taken aback']
}

// Mapping from synonym to Emotion, built from EMOTION_SYNONYMS
export const EMOTION_MAPPING: {[key: string]: Emotion} = Object.entries(EMOTION_SYNONYMS).reduce((acc, [emotion, synonyms]) => {
    synonyms.forEach((synonym) => {
        acc[synonym] = emotion as Emotion;
    });
    return acc;
}, {} as {[key: string]: Emotion});


export type EmotionPack = {[key: string]: string};
