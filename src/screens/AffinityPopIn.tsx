import React, { FC, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';
import { Favorite, HeartBroken } from '@mui/icons-material';

export type AffinityChangeInfo = {
    id: string; // Unique key for AnimatePresence
    actorName: string;
    portraitUrl: string;
    change: number; // Signed change value (positive = gained, negative = lost)
    themeColor: string;
};

interface AffinityPopInProps {
    info: AffinityChangeInfo | null;
    onComplete: () => void;
    displayDurationMs?: number;
}

const MAX_ICONS = 5;
const POP_IN_SCALE = 1.5;

/**
 * A transient, non-interactive overlay that slides in from the top-center of the screen
 * whenever a character's affinity changes. Shows a circular portrait and heart icons
 * indicating the magnitude and direction of the change.
 */
export const AffinityPopIn: FC<AffinityPopInProps> = ({
    info,
    onComplete,
    displayDurationMs = 3000,
}) => {
    // Auto-dismiss after the display duration
    useEffect(() => {
        if (!info) return;
        const timer = setTimeout(() => {
            onComplete();
        }, displayDurationMs);
        return () => clearTimeout(timer);
    }, [info, displayDurationMs, onComplete]);

    const isPositive = (info?.change ?? 0) >= 0;
    const iconCount = Math.min(Math.abs(info?.change ?? 0), MAX_ICONS);

    return (
        <AnimatePresence mode="wait">
            {info && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                >
                    <motion.div
                        key={info.id}
                        initial={{ y: -140 * POP_IN_SCALE, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -60 * POP_IN_SCALE, opacity: 0 }}
                        transition={{
                            enter: { type: 'spring', stiffness: 280, damping: 24 },
                            exit: { duration: 0.4, ease: 'easeIn' },
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                                transform: `scale(${POP_IN_SCALE})`,
                                transformOrigin: 'top center',
                            }}
                        >
                            {/* Heart/broken-heart icons */}
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '3px',
                                mb: '4px',
                                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))',
                            }}>
                                {Array.from({ length: iconCount }).map((_, i) =>
                                    isPositive ? (
                                        <Favorite
                                            key={i}
                                            sx={{ fontSize: 18, color: '#ff6b8a' }}
                                        />
                                    ) : (
                                        <HeartBroken
                                            key={i}
                                            sx={{ fontSize: 18, color: '#9e9e9e' }}
                                        />
                                    )
                                )}
                            </Box>

                            {/* Circular portrait */}
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: `3px solid ${info.themeColor || '#ffffff'}`,
                                    boxShadow: `0 0 12px 2px ${info.themeColor || '#ffffff'}55, 0 4px 16px rgba(0,0,0,0.6)`,
                                    background: '#111',
                                    flexShrink: 0,
                                }}
                            >
                                {info.portraitUrl ? (
                                    <img
                                        src={info.portraitUrl}
                                        alt={info.actorName}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            objectPosition: 'top center',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <Box sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: info.themeColor || '#444',
                                        color: '#fff',
                                        fontSize: 28,
                                        fontWeight: 700,
                                    }}>
                                        {info.actorName.charAt(0).toUpperCase()}
                                    </Box>
                                )}
                            </Box>

                            {/* Actor name */}
                            <Box
                                sx={{
                                    mt: '4px',
                                    px: '10px',
                                    py: '2px',
                                    borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(4px)',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: '0.03em',
                                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {info.actorName}
                            </Box>
                        </Box>
                    </motion.div>
                </Box>
            )}
        </AnimatePresence>
    );
};
