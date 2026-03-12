import { createContext, useContext, useState, useRef, ReactNode, FC } from 'react';
import { SvgIconComponent } from '@mui/icons-material';

interface TooltipContextValue {
    message: string | null;
    icon: SvgIconComponent | undefined;
    setTooltip: (message: string | null, icon?: SvgIconComponent, expiryMs?: number) => void;
    setPriorityMessage: (message: string, icon?: SvgIconComponent, durationMs?: number) => void;
    clearTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

interface TooltipProviderProps {
    children: ReactNode;
}

/**
 * Provider for managing tooltip state across all screens
 */
export const TooltipProvider: FC<TooltipProviderProps> = ({ children }) => {
    const [message, setMessage] = useState<string | null>(null);
    const [icon, setIcon] = useState<SvgIconComponent | undefined>(undefined);
    const [isPriority, setIsPriority] = useState<boolean>(false);
    const savedTooltipRef = useRef<{message: string | null, icon?: SvgIconComponent}>({message: null});
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setTooltip = (newMessage: string | null, newIcon?: SvgIconComponent, expiryMs?: number) => {
        if (!newMessage) {
            clearTooltip();
            return;
        }
        // Don't update if a priority message is active
        if (isPriority) {
            return;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setMessage(newMessage);
        setIcon(newIcon);

        // Set up auto-expiry if specified
        if (expiryMs && expiryMs > 0 && newMessage) {
            timeoutRef.current = setTimeout(() => {
                // Only clear if the message hasn't changed
                setMessage((currentMessage) => {
                    if (currentMessage === newMessage) {
                        setIcon(undefined);
                        return null;
                    }
                    return currentMessage;
                });
                timeoutRef.current = null;
            }, expiryMs);
        }
    };

    const setPriorityMessage = (priorityMessage: string, priorityIcon?: SvgIconComponent, durationMs: number = 5000) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Save the current tooltip state
        savedTooltipRef.current = {
            message,
            icon
        };

        // Set priority message
        setIsPriority(true);
        setMessage(priorityMessage);
        setIcon(priorityIcon);

        // Set up auto-revert after duration
        timeoutRef.current = setTimeout(() => {
            setIsPriority(false);
            // Restore previous tooltip if it existed
            const saved = savedTooltipRef.current;
            setMessage(saved.message);
            setIcon(saved.icon);
            timeoutRef.current = null;
        }, durationMs);
    };

    const clearTooltip = () => {
        // Don't clear if a priority message is active
        if (isPriority) {
            return;
        }

        // Clear any pending timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        setMessage(null);
        setIcon(undefined);
    };

    return (
        <TooltipContext.Provider value={{ message, icon, setTooltip, setPriorityMessage, clearTooltip }}>
            {children}
        </TooltipContext.Provider>
    );
};

/**
 * Hook to access tooltip context in any component
 */
export const useTooltip = (): TooltipContextValue => {
    const context = useContext(TooltipContext);
    if (!context) {
        throw new Error('useTooltip must be used within a TooltipProvider');
    }
    return context;
};
