import { FC, useEffect, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { FiberNew, PlayArrow, Settings } from "@mui/icons-material";
import { SettingsScreen } from "./SettingsScreen";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Button, GridOverlay } from "./UiComponents";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";
import { useTooltip } from "./TooltipContext";
import memoriaLogo from "../assets/memoria-logo.png";

interface MenuScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const MenuScreen: FC<MenuScreenProps> = ({ stage, setScreenType }) => {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isNewGameSettings, setIsNewGameSettings] = useState(false);
    const [expandedSection, setExpandedSection] = useState<'menu' | 'version' | 'attribution'>('menu');
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
        setScreenType(ScreenType.MAP);
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

    const openSection = (section: 'menu' | 'version' | 'attribution') => {
        setExpandedSection(section);
    };

    const getSectionHeaderClass = (section: 'menu' | 'version' | 'attribution') =>
        expandedSection === section ? 'menu-section-header is-active' : 'menu-section-header';

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
                    width: '100%',
                    overflowX: 'visible',
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
                        width: 'min(440px, 90vw)',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflowX: 'visible',
                        overflowY: 'visible',
                        boxSizing: 'border-box',
                        position: 'relative',
                        zIndex: 10,
                    }}
                >
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <Box
                            component="img"
                            src={memoriaLogo}
                            alt="Memoria"
                            style={{ 
                                display: 'block',
                                textAlign: 'center', 
                                marginBottom: 'clamp(20px, 5vh, 40px)', 
                                width: 'min(70vw, 360px)',
                                height: 'auto',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                            }}
                        />
                    </motion.div>

                    {/* Menu sections */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 15px)' }}>
                            <div>
                                <Button
                                    variant="menu"
                                    onClick={() => openSection('attribution')}
                                    className={getSectionHeaderClass('attribution')}
                                style={{
                                    width: '100%',
                                    fontSize: 'clamp(11px, 2.2vw, 14px)',
                                    padding: 'clamp(6px, 1.2vh, 10px) clamp(12px, 2.6vw, 18px)',
                                }}
                            >
                                <span className="menu-section-header-track">
                                    <motion.span
                                        layout="position"
                                        className="menu-section-header-label-shell"
                                        transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                    >
                                        <motion.span
                                            className="menu-section-header-label"
                                            initial={false}
                                            animate={{ x: expandedSection === 'attribution' ? -14 : 14 }}
                                            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                        >
                                            By Miyo
                                        </motion.span>
                                    </motion.span>
                                </span>
                            </Button>
                            <AnimatePresence mode="wait">
                                {expandedSection === 'attribution' && (
                                    <motion.div
                                        key="attribution-content"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        style={{
                                            overflow: 'hidden',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <div
                                            style={{
                                                marginTop: 'clamp(8px, 1.5vh, 12px)',
                                                color: 'rgba(185, 210, 227, 0.72)',
                                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                                lineHeight: 1.5,
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}
                                        >
                                            This is a shared setting. Read the setting document at{' '}
                                            <a
                                                href="https://mechabunny.com/jam/memoria/"
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ 
                                                    color: 'inherit', 
                                                    textDecoration: 'underline',
                                                    wordBreak: 'break-all',
                                                }}
                                            >
                                                mechabunny.com/jam/memoria
                                            </a>{' '}
                                            and visit Miyo&apos;s Chub profile at{' '}
                                            <a
                                                href="https://chub.ai/users/miyo_rin"
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ 
                                                    color: 'inherit', 
                                                    textDecoration: 'underline',
                                                    wordBreak: 'break-all',
                                                }}
                                            >
                                                chub.ai/users/miyo_rin
                                            </a>
                                            .
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div>
                            <Button
                                variant="menu"
                                onClick={() => openSection('menu')}
                                className={getSectionHeaderClass('menu')}
                                style={{
                                    width: '100%',
                                    fontSize: 'clamp(11px, 2.2vw, 14px)',
                                    padding: 'clamp(6px, 1.2vh, 10px) clamp(12px, 2.6vw, 18px)',
                                }}
                            >
                                <span className="menu-section-header-track">
                                    <motion.span
                                        layout="position"
                                        className="menu-section-header-label-shell"
                                        transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                    >
                                        <motion.span
                                            className="menu-section-header-label"
                                            initial={false}
                                            animate={{ x: expandedSection === 'menu' ? -14 : 14 }}
                                            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                        >
                                            Menu
                                        </motion.span>
                                    </motion.span>
                                </span>
                            </Button>
                            <AnimatePresence mode="wait">
                                {expandedSection === 'menu' && (
                                    <motion.div
                                        key="menu-content"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        style={{
                                            overflowY: 'hidden',
                                            overflowX: 'visible',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <div style={{ overflow: 'visible', marginTop: 'clamp(8px, 1.5vh, 12px)', display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 15px)' }}>
                                            {menuButtons.map((button, index) => (
                                                <motion.div
                                                    key={button.key}
                                                    initial={{ opacity: 0, x: -30 }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: hoveredButton === button.key && button.enabled ? 10 : 0
                                                    }}
                                                    transition={{
                                                        opacity: { delay: 0.15 + (index * 0.08), duration: 0.4, ease: 'easeOut' },
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
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div>
                            <Button
                                variant="menu"
                                onClick={() => openSection('version')}
                                className={getSectionHeaderClass('version')}
                                style={{
                                    width: '100%',
                                    fontSize: 'clamp(11px, 2.2vw, 14px)',
                                    padding: 'clamp(6px, 1.2vh, 10px) clamp(12px, 2.6vw, 18px)',
                                }}
                            >
                                <span className="menu-section-header-track">
                                    <motion.span
                                        layout="position"
                                        className="menu-section-header-label-shell"
                                        transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                    >
                                        <motion.span
                                            className="menu-section-header-label"
                                            initial={false}
                                            animate={{ x: expandedSection === 'version' ? -14 : 14 }}
                                            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
                                        >
                                            Version Notes
                                        </motion.span>
                                    </motion.span>
                                </span>
                            </Button>
                            <AnimatePresence mode="wait">
                                {expandedSection === 'version' && (
                                    <motion.div
                                        key="version-content"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        style={{
                                            overflow: 'hidden',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                marginTop: 'clamp(8px, 1.5vh, 12px)',
                                                color: 'rgba(185, 210, 227, 0.72)',
                                                fontSize: 'clamp(10px, 1.5vw, 12px)',
                                                letterSpacing: '0.04em',
                                                width: '100%',
                                                boxSizing: 'border-box',
                                            }}
                                        >
                                            {'v2026.03.19 - Alpha junk; lots going on.'}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </Box>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsScreen
                    stage={stage}
                    onCancel={handleSettingsCancel}
                    onConfirm={handleSettingsConfirm}
                    isNewGame={isNewGameSettings}
                    setScreenType={setScreenType}
                />
            )}
        </BlurredBackground>
    );
};