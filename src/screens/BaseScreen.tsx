import React, { FC } from 'react';
import { Stage } from '../Stage';
import { SkitScreen } from './SkitScreen';
import { ThemeProvider } from '@mui/material';
import { TooltipProvider, useTooltip } from './TooltipContext';
import { MenuScreen } from './MenuScreen';
import { TooltipBar } from './TooltipBar';
import { theme } from './Theme';
import { MapScreen } from './MapScreen';
import { LoadingScreen } from './LoadingScreen';

/*
 * Base screen management; the Stage class will display this, and this will track the current screen being displayed.
 */

export enum ScreenType {
    MENU = 'menu',
    LOADING = 'loading',
    SKIT = 'skit',
    MAP = 'map',
}

interface BaseScreenProps {
    stage: () => Stage;
}

const BaseScreenContent: FC<{ stage: () => Stage }> = ({ stage }) => {
    const [screenType, setScreenType] = React.useState<ScreenType>(ScreenType.MENU);
    const [isVerticalLayout, setIsVerticalLayout] = React.useState<boolean>(stage().isVerticalLayout());
    const { message, icon, clearTooltip, setPriorityMessage } = useTooltip();


    // Set up the priority message callback in the stage
    React.useEffect(() => {
        stage().setPriorityMessageCallback(setPriorityMessage);
    }, [setPriorityMessage]);

    // Update layout orientation on resize
    React.useEffect(() => {
        const handleResize = () => {
            setIsVerticalLayout(stage().isVerticalLayout());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Clear tooltip whenever screen type changes
    React.useEffect(() => {
        clearTooltip();
    }, [screenType]);

    return (
        <div className="memoria-screen-root">
            {screenType === ScreenType.MENU && (
                // Render menu screen
                <MenuScreen stage={stage} setScreenType={setScreenType} />
            )}
            {/*screenType === ScreenType.LOADING && (
                // Render loading screen
                <LoadingScreen stage={stage} setScreenType={setScreenType} />
            )*/}
            {screenType === ScreenType.SKIT && (
                // Render studio screen
                <SkitScreen 
                    stage={stage} 
                    setScreenType={setScreenType} 
                    isVerticalLayout={isVerticalLayout}
                />
            )}
            {screenType === ScreenType.MAP && (
                <MapScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.LOADING && (
                <LoadingScreen stage={stage} setScreenType={setScreenType} />
            )}
            {/* Unified tooltip bar that renders over all screens */}
            <TooltipBar 
                message={message} 
                Icon={icon}
                onDismiss={clearTooltip}
                isVerticalLayout={isVerticalLayout}
            />
        </div>
    );
};

export const BaseScreen: FC<BaseScreenProps> = ({ stage }) => {
    return (
        <ThemeProvider theme={theme}>
            <TooltipProvider>
                <BaseScreenContent stage={stage} />
            </TooltipProvider>
        </ThemeProvider>
    );
}