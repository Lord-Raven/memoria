import { FC, useEffect, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { FiberNew, PlayArrow, Settings } from "@mui/icons-material";
import { SettingsScreen } from "./SettingsScreen";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Button, GridOverlay, Title } from "./UiComponents";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import { useTooltip } from "./TooltipContext";

interface MenuScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const MenuScreen: FC<MenuScreenProps> = ({ stage, setScreenType }) => {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isNewGameSettings, setIsNewGameSettings] = useState(false);
    const { setTooltip, clearTooltip } = useTooltip();
    const disableAllButtons = false; // When true, disable all options on this menu, including escape to continue; this is being used to effectively shut down the game at the moment.
    
    // Check if a save exists (if there are any actors or the layout has been modified)
    const saveExists = () => {
        return stage().getSave() && Object.keys(stage().getSave().actors).length > 2;
    };

    // Handle escape key to continue game if available
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !disableAllButtons) {
                if (showSettings) {
                    console.log('close settings');
                    handleSettingsCancel();
                } else if (saveExists() && !showSettings) {
                    console.log('continue');
                    handleContinue();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSettings]);

    const handleContinue = () => {
        setScreenType(ScreenType.SKIT);
    };

    const handleNewGame = () => {
        setIsNewGameSettings(true);
        setShowSettings(true);
    };

    const handleSettings = () => {
        // Show settings screen
        setIsNewGameSettings(false);
        setShowSettings(true);
    };

    const handleSettingsCancel = () => {
        setShowSettings(false);
        setIsNewGameSettings(false);
    };

    const handleSettingsConfirm = () => {
        setShowSettings(false);
        if (isNewGameSettings) {
            setIsNewGameSettings(false);
            setScreenType(ScreenType.LOADING);
        }
    };

    const menuButtons = [
        ...(saveExists() ? [{ 
            key: 'continue', 
            label: 'Continue', 
            onClick: handleContinue,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Resume your current game',
            icon: PlayArrow
        }] : []),
        { 
            key: 'new', 
            label: 'New Game', 
            onClick: handleNewGame,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Start a fresh playthrough',
            icon: FiberNew
        },
        { 
            key: 'settings', 
            label: 'Settings', 
            onClick: handleSettings,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Adjust game settings and preferences',
            icon: Settings
        }
    ];

    return (
        <BlurredBackground
            imageUrl="https://avatars.charhub.io/avatars/uploads/images/gallery/file/5c990a43-3e56-455f-ba19-ba487eec4972/1a9f6a36-676f-4dc1-85ae-29bf7a97e538.png"
            overlay="linear-gradient(142deg, rgba(19, 24, 39, 0.78) 0%, rgba(37, 45, 66, 0.76) 52%, rgba(31, 47, 43, 0.72) 100%)"
        >
            <Box 
                sx={{
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh', 
                    width: '100vw',
                    position: 'relative',
                }}
            >
                {/* Background grid effect */}
                <GridOverlay />

                {/* Main menu container */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="glass-panel-bright memoria-entrance"
                    style={{
                        padding: 'clamp(20px, 5vh, 40px) clamp(20px, 5vw, 40px)',
                        minWidth: '300px',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxSizing: 'border-box',
                        position: 'relative',
                        zIndex: 10,
                    }}
                >
                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <Title 
                            variant="glow" 
                            style={{ 
                                textAlign: 'center', 
                                marginBottom: 'clamp(20px, 5vh, 40px)', 
                                fontSize: 'clamp(18px, 5vw, 32px)' 
                            }}
                        >
                            Memoria
                        </Title>
                    </motion.div>

                    {/* Menu buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 15px)' }}>
                        {menuButtons.map((button, index) => (
                            <motion.div
                                key={button.key}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ 
                                    opacity: 1, 
                                    x: hoveredButton === button.key && button.enabled ? 10 : 0
                                }}
                                transition={{ 
                                    opacity: { delay: 0.4 + (index * 0.1), duration: 0.4, ease: 'easeOut' },
                                    x: { duration: 0.2, ease: 'easeOut' }
                                }}
                                onMouseEnter={() => {
                                    setHoveredButton(button.enabled ? button.key : null);
                                    setTooltip(button.tooltip, button.icon);
                                }}
                                onMouseLeave={() => {
                                    setHoveredButton(null);
                                    clearTooltip();
                                }}
                            >
                                <Button
                                    variant="menu"
                                    onClick={button.enabled ? button.onClick : undefined}
                                    disabled={!button.enabled}
                                    style={{
                                        width: '100%',
                                        fontSize: 'clamp(12px, 2.5vw, 16px)',
                                        padding: 'clamp(8px, 1.5vh, 12px) clamp(16px, 3vw, 24px)',
                                    }}
                                >
                                    {button.label}
                                </Button>
                            </motion.div>
                        ))}
                    </div>

                    {/* Subtitle/version info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        style={{
                            textAlign: 'center',
                            marginTop: 'clamp(20px, 4vh, 30px)',
                            color: 'rgba(185, 210, 227, 0.72)',
                            fontSize: 'clamp(10px, 1.5vw, 12px)',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {'v2026.03.14 - Ruinfield visual pass, atmospheric shell updates.'}
                    </motion.div>
                </motion.div>
            </Box>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsScreen
                    stage={stage}
                    onCancel={handleSettingsCancel}
                    onConfirm={handleSettingsConfirm}
                    isNewGame={isNewGameSettings}
                />
            )}
        </BlurredBackground>
    );
};