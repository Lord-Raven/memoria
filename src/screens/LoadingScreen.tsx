import { FC, useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { GridOverlay, GlassPanel, Title } from './UiComponents';
import { motion } from 'framer-motion';
import { GearSliderFidget } from './GearSliderFidget';

/*
 * Loading screen that displays while content is being loaded.
 * Monitors the loadPromises and automatically transitions to the Studio screen when complete.
 */

interface LoadingScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

const LOADING_PHASES = [
    { message: "Discovering content...", duration: 12000, progress: 35 },
    { message: "Generating imagery...", duration: 12000, progress: 60 },
    { message: "Finalizing world...", duration: Infinity, progress: 90 },
];

export const LoadingScreen: FC<LoadingScreenProps> = ({ stage, setScreenType }) => {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // Poll for completion of loading
    useEffect(() => {
        const interval = setInterval(() => {
            const loadPromises = stage().generationPromises;

            // Temporarily output keys of loadPromises for debugging
            console.log('Current load promises:', Object.keys(loadPromises).join(', '));
            
            // If all load promises have completed (array is empty), transition to studio screen
            if (!loadPromises || Object.keys(loadPromises).length === 0) {
                console.log('Done loading');
                stage().saveGame();
                setScreenType(ScreenType.MAP);
            }   
        }, 100);
        
        return () => clearInterval(interval);
    }, [stage, setScreenType]);

    // Handle phase transitions and progress animation
    useEffect(() => {
        const currentPhase = LOADING_PHASES[currentPhaseIndex];
        const targetProgress = currentPhase.progress;
        
        // Smoothly animate progress to target
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev < targetProgress) {
                    return Math.min(prev + 0.5, targetProgress);
                }
                return prev;
            });
        }, 50);

        // Move to next phase after duration (if not the last phase)
        let phaseTimeout: NodeJS.Timeout | null = null;
        if (currentPhaseIndex < LOADING_PHASES.length - 1) {
            phaseTimeout = setTimeout(() => {
                setCurrentPhaseIndex(prev => Math.min(prev + 1, LOADING_PHASES.length - 1));
            }, currentPhase.duration);
        }

        return () => {
            clearInterval(progressInterval);
            if (phaseTimeout) clearTimeout(phaseTimeout);
        };
    }, [currentPhaseIndex]);

    const currentPhase = LOADING_PHASES[currentPhaseIndex];

    return (
        <Box
            className="memoria-screen-root"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                background:
                    'radial-gradient(120% 100% at 12% 16%, rgba(138, 176, 204, 0.2) 0%, rgba(26, 30, 48, 0) 52%), radial-gradient(95% 95% at 86% 82%, rgba(137, 205, 135, 0.18) 0%, rgba(26, 30, 48, 0) 58%), linear-gradient(160deg, #171b2d 0%, #1f2438 50%, #161a2a 100%)',
                position: 'relative',
                overflow: 'hidden',
                isolation: 'isolate',
            }}
        >
            <GridOverlay size={56} />

            <motion.div
                className="memoria-entrance"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 2 }}
            >
                <GlassPanel
                    variant="bright"
                    style={{
                        width: 'min(560px, 92vw)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '16px',
                        padding: '28px 26px',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                        <Title variant="glow" style={{ margin: 0, fontSize: 'clamp(1.2rem, 2.7vw, 1.65rem)' }}>
                            Initializing Atlas
                        </Title>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'var(--mem-text-secondary)',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            {Math.round(progress)}%
                        </Typography>
                    </Box>

                    <Typography
                        variant="body1"
                        sx={{
                            color: 'var(--mem-text-secondary)',
                            fontWeight: 500,
                            textAlign: 'left',
                            minHeight: '24px',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {currentPhase.message}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                        <GearSliderFidget
                            loadingPercentage={progress}
                            gearSize={184}
                            rackWidth={520}
                            rackHeight={34}
                            rackViewportWidth={270}
                        />
                    </Box>
                </GlassPanel>
            </motion.div>
        </Box>
    );
};
