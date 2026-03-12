import { Stage } from "../Stage";
import { ScriptEntry, Skit, SkitType } from "../content/Skit";
import { FC, useEffect, useRef, useState } from "react";
import { ScreenType } from "./BaseScreen";
import { Actor, findBestNameMatch, removeBackgroundFromEmotionImage } from "../content/Actor";
import { NovelVisualizer } from "@lord-raven/novel-visualizer";
import { Emotion } from "../content/Emotion";
import { Box, Typography } from "@mui/material";
import { LastPage, PlayArrow, Send } from "@mui/icons-material";
import { useCallback } from "react";
import { NamePlate } from "./UiComponents";
import { useTooltip } from "./TooltipContext";

interface SkitScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
    isVerticalLayout: boolean;
}

// Temporary:
export function generateNextSkit(): Skit {
    // For now, just return a new skit with the next phase as the title and location, and an empty script.
    return {
        id: `skit-${Date.now()}`,
        skitType: SkitType.SOCIAL,
        initialLocationId: '',
        script: [],
        initialActors: []
    };
}

// Also temporary:
export async function generateSkitScript(skit: Skit, stage: Stage): Promise<{entries: ScriptEntry[]}> {
    // For now, just return a placeholder script entry that references the skit's initial location and actors.
    const locationDescription = skit.initialLocationId ? `Location: ${skit.initialLocationId}. ` : '';
    const actorDescriptions = skit.initialActors.length > 0 ? `Actors present: ${skit.initialActors.map(actorId => stage.getSave().actors[actorId]?.name || actorId).join(', ')}. ` : '';
    const content = `This is a generated script entry for the skit. ${locationDescription}${actorDescriptions}.`;
    return {
        entries: [
            {
                speakerId: '',
                message: content,
                speechUrl: '',
                actorEmotions: {},
                updatedActors: skit.initialActors,
                updatedLocationId: skit.initialLocationId
            }
        ]
    };
}

// This screen represents the main game screen in a gameshow studio setting. The player will make some basic choices that lead to different skits and direct the flow of the game.
export const SkitScreen: FC<SkitScreenProps> = ({ stage, setScreenType, isVerticalLayout }) => {
    const [isGeneratingNextSkit, setIsGeneratingNextSkit] = useState(false);
    const { setTooltip, clearTooltip } = useTooltip();
    
    // This is a physical description of the studio space for SoulMatcher, a dating gameshow on which the player is a contestant.
    const studioDescription = "The studio is a vibrant and dynamic space, designed to evoke the excitement and glamour of a high-stakes dating gameshow. The stage is set with bright, colorful lights that create an energetic atmosphere, while large LED screens display dynamic backgrounds that change with each skit. The audience area is filled with enthusiastic spectators, their cheers and reactions adding to the lively ambiance. The contestant's podium is sleek and modern, equipped with interactive elements that allow the player to make choices that influence the flow of the game. Overall, the studio is a visually stimulating environment that immerses the player in the thrilling world of SoulMatcher.";

    // Handle ESC key to open menu
    const handleEscapeKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setScreenType(ScreenType.MENU);
        }
    }, [setScreenType]);

    useEffect(() => {
        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, [handleEscapeKey]);

    // Handler for when the submit button is pressed in NovelVisualizer. At this point, if the user had input, it has been spliced into the script.
    const handleSubmit = async (input: string, skit: any, index: number) => {
        if (input.trim() === '' && index < (skit as Skit).script.length - 1) {
            console.log('No input and more skit to display; no action needed.');
            return skit;
        } else if (input.trim() === '' && (skit as Skit).script[index].endScene) {
            console.log('No input and skit complete; proceed to next phase or whatever.');
            // Generate the next skit and generate its initial script before returning
            const nextSkit = generateNextSkit();
            const scriptResult = await generateSkitScript(nextSkit, stage());
            nextSkit.script.push(...scriptResult.entries);
            // TODO: Handle this.
            // stage().addSkit(nextSkit);
            stage().saveGame();

            return nextSkit;
        } else {
            console.log('Skit not over; generate more script.');
            const nextEntries = await generateSkitScript(skit as Skit, stage());
            (skit as Skit).script.push(...nextEntries.entries);
            // Replace the stage skit with the updated skit:
            // TODO: Handle this.
            // stage().getSave().skits[skit.id] = {...stage().getSave().skits[skit.id], script: (skit as Skit).script};
            stage().saveGame();
            console.log('Generated additional skit content after empty input.');
            return skit;
        }
    };
    
    // Returns the last emotion for the given actor in the skit up to the current index, or neutral if none found.
    const determineEmotion = (actorId: string, skit: Skit, index: number): Emotion => {
        let emotion = Emotion.neutral;
        for (let i = index; i >= 0; i--) {
            const line = skit.script[i];
            if (line && line.actorEmotions && line.actorEmotions[actorId]) {
                emotion = line.actorEmotions[actorId];
                break;
            }
        }
        return emotion;
    }

    let skit = stage().getCurrentSkit();


    const bannerTitle = 'Default Thing';

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Title Ribbon */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    border: '2px solid #FFD700',
                    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        color: '#FFD700',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {bannerTitle}
                </Typography>
            </Box>
            
            {(skit && skit.script) ? <NovelVisualizer
            script={skit}
            renderNameplate={(actor: any) => {
                if (!actor || !actor.name) return null;
                const typedActor = actor as Actor;
                return (
                    <NamePlate
                        actor={typedActor}
                    />
                );
            }}
            getBackgroundImageUrl={(script, index: number) => {return ''}}
            setTooltip={setTooltip}
            isVerticalLayout={isVerticalLayout}
            actors={stage().getSave().actors}
            playerActorId={stage().getPlayerActor().id}
            getPresentActors={(script, index: number) => (script as Skit).initialActors?.map(actorId => stage().getSave().actors[actorId]).filter(actor => actor) || []}
            getActorImageUrl={(actor, script, index: number) => {
                const emotion = determineEmotion(actor.id, script as Skit, index);
                // If this actor is flagged for background removal and the emotion image URL has "avatars" in it, it's part of an official pack that was determined to be non-transparent; use neutral for now.
                if (actor.flagForBackgroundRemoval && actor.emotionPack[emotion] && actor.emotionPack[emotion].includes('avatars')) {
                    return actor.emotionPack[Emotion.neutral] || '';
                }
                return actor.emotionPack[emotion] || actor.emotionPack[Emotion.neutral] || '';
            }}
            onSubmitInput={handleSubmit}
            getSubmitButtonConfig={(script, index, inputText) => {
                const endScene = index >= 0 ? ((script as Skit).script[index]?.endScene || false) : false;
                return {
                    label: (inputText.trim().length > 0 ? 'Send' : (endScene ? 'Next Round' : 'Continue')),
                    enabled: true,
                    colorScheme: (inputText.trim().length > 0 ? 'primary' : (endScene ? 'error' : 'primary')),
                    icon: (inputText.trim().length > 0 ? <Send/> : (endScene ? <LastPage/> : <PlayArrow/>))
                }
            }}
            enableAudio={!stage().getSave().textToSpeech}
            enableGhostSpeakers={true}
            enableTalkingAnimation={true}
            renderActorHoverInfo={(actor) => {
                if (!actor || actor.id === stage().getPlayerActor().id) return null;
                const typedActor = actor as Actor;
                const authorName = typedActor.fullPath?.split('/').filter(Boolean)[0] || '';
                return (
                    <Box
                        sx={{
                            padding: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            borderRadius: 2,
                            border: `2px solid ${typedActor.themeColor || '#ffffff'}`,
                            maxWidth: 300,
                        }}
                    >
                        <Box sx={{ marginBottom: 1 }}>
                            <NamePlate
                                actor={typedActor}
                            />
                        </Box>
                        {authorName && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    marginBottom: 1,
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontStyle: 'italic',
                                    fontFamily: 'serif',
                                }}
                            >
                                by {authorName}
                            </Typography>
                        )}
                        <Box
                            sx={{
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                lineHeight: 1.4,
                            }}
                        >
                            {typedActor.profile}
                        </Box>
                    </Box>
                );
            }}
        /> : <></>}
        </Box>
    );
}