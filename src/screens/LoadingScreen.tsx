import { FC, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
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

export const LoadingScreen: FC<LoadingScreenProps> = ({ stage, setScreenType }) => {
    const [progress, setProgress] = useState(0);
    const seenPromiseKeysRef = useRef<Set<string>>(new Set());
    const hasObservedPromiseActivityRef = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const currentStage = stage();
            const normalizedAnticipatedPromiseCount = Math.max(currentStage.anticipatedLoadingPromiseCount, 1);
            const loadPromises = currentStage.generationPromises;
            const currentPromiseKeys = Object.keys(loadPromises || {});
            const currentPromiseKeySet = new Set(currentPromiseKeys);

            if (currentPromiseKeys.length > 0) {
                hasObservedPromiseActivityRef.current = true;
            }

            currentPromiseKeys.forEach((key) => {
                seenPromiseKeysRef.current.add(key);
            });

            let nextCompletedPromiseCount = 0;
            seenPromiseKeysRef.current.forEach((key) => {
                if (!currentPromiseKeySet.has(key)) {
                    nextCompletedPromiseCount += 1;
                }
            });

            setProgress(Math.min((nextCompletedPromiseCount / normalizedAnticipatedPromiseCount) * 100, 100));

            if (currentPromiseKeys.length === 0 && hasObservedPromiseActivityRef.current) {
                console.log('Done loading');
                currentStage.saveGame();
                setScreenType(ScreenType.MAP);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [setScreenType, stage]);

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
                            Generating Content...
                        </Title>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                        <GearSliderFidget
                            loadingPercentage={progress}
                            gearSize={226.46}
                            rackWidth={640}
                            rackHeight={41.85}
                            rackViewportWidth={240}
                        />
                    </Box>
                </GlassPanel>
            </motion.div>
        </Box>
    );
};
