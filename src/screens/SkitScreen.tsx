import { Stage } from "../Stage";
import { determineEmotion, generateSkitScript, getCurrentLocation, ScriptEntry, Skit, SkitType } from "../content/Skit";
import { FC, useEffect, useState } from "react";
import { ScreenType } from "./BaseScreen";
import { Actor, getEmotionImage } from "../content/Actor";
import { NovelVisualizer } from "@lord-raven/novel-visualizer";
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
        initialActors: [],
        summary: ''
    };
}

// Main skit scene where narrative flow and user prompts are rendered.
export const SkitScreen: FC<SkitScreenProps> = ({ stage, setScreenType, isVerticalLayout }) => {
    const [isGeneratingNextSkit, setIsGeneratingNextSkit] = useState(false);
    const { setTooltip, clearTooltip } = useTooltip();

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
        if (input.trim() === '' && index < skit.script.length - 1) {
            console.log('No input and more skit to display; no action needed.');
            return skit;
        } else if (input.trim() === '' && skit.script.length > 0 && skit.script[index].endScene) {
            console.log('No input and skit complete; proceed to next phase or whatever.');
            // Generate the next skit and generate its initial script before returning
            const nextSkit = generateNextSkit();
            const scriptResult = await generateSkitScript(nextSkit, stage());
            nextSkit.script.push(...scriptResult);
            // TODO: Handle this.
            // stage().addSkit(nextSkit);
            stage().saveGame();

            return nextSkit;
        } else {
            console.log('Skit not over; generate more script.');
            const nextEntries = await generateSkitScript(skit as Skit, stage());
            (skit as Skit).script.push(...nextEntries);
            // Replace the stage skit with the updated skit:
            // TODO: Handle this.
            // stage().getSave().skits[skit.id] = {...stage().getSave().skits[skit.id], script: (skit as Skit).script};
            stage().saveGame();
            console.log('Generated additional skit content after empty input.');
            return skit;
        }
    };

    let skit = stage().getCurrentSkit();


    const bannerTitle = skit?.initialLocationId
        ? `${stage().getSave().atlas[skit.initialLocationId]?.name || skit.initialLocationId}`
        : 'Memoria';

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Title Ribbon */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 1000,
                    backgroundColor: 'rgba(22, 28, 44, 0.76)',
                    backdropFilter: 'blur(6px)',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    border: '1px solid rgba(138, 176, 204, 0.48)',
                    boxShadow: '0 4px 18px rgba(10, 16, 29, 0.55), 0 0 16px rgba(138, 176, 204, 0.2)',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        color: '#edf2f2',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        textShadow: '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 10px rgba(138, 176, 204, 0.24)',
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
            getBackgroundImageUrl={(script, index: number) => {return stage().getSave().atlas[getCurrentLocation(script, index) || '']?.imageUrl || ''}}
            setTooltip={setTooltip}
            isVerticalLayout={isVerticalLayout}
            actors={stage().getSave().actors}
            playerActorId={stage().getPlayerActor().id}
            getPresentActors={(script, index: number) => (script as Skit).initialActors?.map(actorId => stage().getSave().actors[actorId]).filter(actor => actor) || []}
            getActorImageUrl={(actor, script, index: number) => {
                const emotion = determineEmotion(actor.id, script as Skit, index);

                return getEmotionImage(actor, emotion, stage(), actor.appearanceId) || getEmotionImage(actor, 'neutral', stage(), actor.appearanceId) || '';
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
                            backgroundColor: 'rgba(21, 27, 41, 0.9)',
                            borderRadius: 2,
                            border: `1px solid ${typedActor.themeColor || '#8ab0cc'}`,
                            maxWidth: 300,
                            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55)',
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
                                    color: 'rgba(185, 210, 227, 0.84)',
                                    fontStyle: 'italic',
                                    fontFamily: '"Lora", Georgia, serif',
                                }}
                            >
                                by {authorName}
                            </Typography>
                        )}
                        <Box
                            sx={{
                                color: '#edf2f2',
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