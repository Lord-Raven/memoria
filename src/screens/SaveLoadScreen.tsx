import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Stage, SaveType } from '../Stage';
import { Save, FolderOpen, Close, Delete } from '@mui/icons-material';
import { ScreenType } from './BaseScreen';
import { useTooltip } from './TooltipContext';
import { ActorType, getEmotionImage } from '../content/Actor';
import { Button, Title } from './UiComponents';

interface SaveLoadScreenProps {
    stage: () => Stage;
    mode: 'save' | 'load';
    onClose: () => void;
    setScreenType?: (type: ScreenType) => void;
}

export const SaveLoadScreen: FC<SaveLoadScreenProps> = ({ stage, mode, onClose, setScreenType }) => {
    const { setTooltip, clearTooltip } = useTooltip();
    const [hoveredSlot, setHoveredSlot] = React.useState<number | null>(null);
    const [deleteConfirmSlot, setDeleteConfirmSlot] = React.useState<number | null>(null);

    const handleSlotClick = (slotIndex: number) => {
        if (mode === 'save') {
            // Save to this slot
            stage().saveToSlot(slotIndex);
            setTooltip('Game saved!', Save, 2000);
            onClose();
        } else {
            // Load from this slot
            stage().loadSave(slotIndex);
            setTooltip('Game loaded!', FolderOpen, 2000);
            onClose();
            // Navigate to main game screen
            if (setScreenType) {
                setScreenType(ScreenType.MAP);
            }
        }
    };

    const handleDelete = (slotIndex: number) => {
        stage().deleteSave(slotIndex);
        setDeleteConfirmSlot(null);
        setTooltip('Save deleted', Delete, 2000);
    };

    const formatTimestamp = (timestamp?: number): string => {
        if (!timestamp) return 'No Date';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const renderSaveSlot = (slotIndex: number) => {

        const save = stage().saveData.saves[slotIndex];
        const isEmpty = !save;
        const isCurrentSlot = stage().saveData.lastSaveSlot === slotIndex;

        // Get non-warden, non-player actors:
        let actors = !isEmpty ? Object.values(save.actors).filter(actor => actor.type !== ActorType.WARDEN && actor.type !== ActorType.PLAYER) : [];
        // Sort actors by most recent appearance in a skit (initial only).
        actors.map(actor => {
            const lastAppearance = save?.timeline.filter(entry => entry.skit).sort((a, b) => b.turn - a.turn).reduce((last, entry, index) => {
                const found = entry?.skit?.initialActors.includes(actor.id);
                return found ? Math.max(last, index) : last;
            }, 0) || 0;
            return {...actor, lastAppearance: lastAppearance};
        }).filter(a => a.lastAppearance > 0).sort((a, b) => b.lastAppearance - a.lastAppearance);

        // Trim actors to max of 5 for display:
        actors = actors.slice(0, 5);

        return (
            <motion.div
                key={slotIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                    opacity: 1, 
                    x: hoveredSlot === slotIndex ? 5 : 0 
                }}
                transition={{ 
                    delay: slotIndex * 0.05,
                    x: { duration: 0.2 }
                }}
                style={{ width: '100%' }}
            >
                <Button
                    variant="menu"
                    onMouseEnter={() => {
                        setHoveredSlot(slotIndex);
                        setTooltip(
                            mode === 'save' 
                                ? `Save game to slot ${slotIndex + 1}` 
                                : isEmpty 
                                    ? 'Empty slot' 
                                    : `Load game from slot ${slotIndex + 1}`,
                            mode === 'save' ? Save : FolderOpen
                        );
                    }}
                    onMouseLeave={() => {
                        setHoveredSlot(null);
                        clearTooltip();
                    }}
                    onClick={() => handleSlotClick(slotIndex)}
                    disabled={mode === 'load' && isEmpty}
                    style={{
                        width: '100%',
                        height: '85px',
                        padding: '8px 12px',
                        paddingRight: isEmpty ? '12px' : '50px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'center',
                        background: isCurrentSlot 
                            ? 'rgba(0, 255, 136, 0.15)' 
                            : hoveredSlot === slotIndex && !(mode === 'load' && isEmpty)
                                ? 'rgba(0, 255, 136, 0.1)' 
                                : 'rgba(0, 20, 40, 0.5)',
                        border: isCurrentSlot ? '2px solid rgba(0, 255, 136, 0.5)' : undefined,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Delete button for filled slots */}
                    {!isEmpty && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmSlot(slotIndex);
                            }}
                            onMouseEnter={(e) => {
                                e.stopPropagation();
                                setTooltip(isCurrentSlot ? 'Cannot delete current save' : 'Delete save', Delete);
                            }}
                            onMouseLeave={(e) => {
                                e.stopPropagation();
                                clearTooltip();
                            }}
                            disabled={isCurrentSlot}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: '40px',
                                background: isCurrentSlot ? 'rgba(100, 100, 100, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                                border: 'none',
                                borderLeft: isCurrentSlot ? '1px solid rgba(100, 100, 100, 0.4)' : '1px solid rgba(255, 0, 0, 0.4)',
                                borderRadius: '0 4px 4px 0',
                                color: isCurrentSlot ? 'rgba(150, 150, 150, 0.5)' : 'rgba(255, 100, 100, 0.9)',
                                cursor: isCurrentSlot ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                fontSize: '18px',
                                opacity: isCurrentSlot ? 0.5 : 1
                            }}
                            onMouseOver={(e) => {
                                if (!isCurrentSlot) {
                                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)';
                                    e.currentTarget.style.color = 'rgba(255, 150, 150, 1)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isCurrentSlot) {
                                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                                    e.currentTarget.style.color = 'rgba(255, 100, 100, 0.9)';
                                }
                            }}
                        >
                            <Delete fontSize="small" />
                        </button>
                    )}

                    {isEmpty ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'rgba(0, 255, 136, 0.3)',
                            fontSize: '14px',
                            fontStyle: 'italic'
                        }}>
                            Empty Slot
                        </div>
                    ) : (
                        <>
                            {/* Actor portraits as background */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: '40px',
                                display: 'flex',
                                height: '85px',
                                opacity: 0.3,
                                pointerEvents: 'none'
                            }}>
                                {actors.slice(0, 10).map((actor) => (
                                    <div
                                        key={actor.id}
                                        style={{
                                            width: '85px',
                                            height: '85px',
                                            overflow: 'hidden'
                                        }}
                                        title={actor.name}
                                    >
                                        <img
                                            src={getEmotionImage(actor, 'neutral')}
                                            alt={actor.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: 'top center'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Single column layout */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '4px',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'rgba(0, 255, 136, 0.7)'
                                }}>
                                    {formatTimestamp(save.timestamp)}
                                </div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: 'rgba(0, 255, 136, 1)'
                                }}>
                                    {save.actors[save.playerId].name} - Day {save.turn}
                                </div>
                            </div>
                        </>
                    )}
                </Button>
            </motion.div>
        );
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass-panel-bright"
                style={{
                    padding: '30px',
                    maxWidth: '800px',
                    width: '90%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
            >
                {/* Header with close button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                }}>
                    <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                        {mode === 'save' ? 'Save Game' : 'Load Game'}
                    </Title>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        onMouseEnter={() => setTooltip('Close', Close)}
                        onMouseLeave={() => clearTooltip()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(0, 255, 136, 0.7)',
                            cursor: 'pointer',
                            fontSize: '24px',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Close />
                    </motion.button>
                </div>

                {/* Auto-save note for save mode */}
                {mode === 'save' && (
                    <div style={{
                        fontSize: '12px',
                        color: 'rgba(0, 255, 136, 0.6)',
                        fontStyle: 'italic',
                        marginBottom: '15px',
                        textAlign: 'left'
                    }}>
                        The game will continue to auto-save to your selected slot.
                    </div>
                )}

                {/* Save slots container */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '10px'
                }}>
                    {Array.from({ length: 10 }, (_, i) => renderSaveSlot(i))}
                </div>
            </motion.div>

            {/* Delete confirmation modal */}
            {deleteConfirmSlot !== null && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteConfirmSlot(null);
                        }
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-panel-bright"
                        style={{
                            padding: '30px',
                            maxWidth: '400px',
                            width: '90%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}
                    >
                        <Title variant="glow" style={{ textAlign: 'center', fontSize: '20px' }}>
                            Delete Save?
                        </Title>
                        <div style={{
                            color: 'rgba(0, 255, 136, 0.8)',
                            textAlign: 'center',
                            fontSize: '14px'
                        }}>
                            Are you sure you want to delete this save? This action cannot be undone.
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center'
                        }}>
                            <Button
                                variant="menu"
                                onClick={() => setDeleteConfirmSlot(null)}
                                onMouseEnter={() => setTooltip('Cancel', Close)}
                                onMouseLeave={() => clearTooltip()}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(0, 255, 136, 0.1)'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="menu"
                                onClick={() => handleDelete(deleteConfirmSlot)}
                                onMouseEnter={() => setTooltip('Confirm deletion', Delete)}
                                onMouseLeave={() => clearTooltip()}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255, 0, 0, 0.2)',
                                    border: '2px solid rgba(255, 0, 0, 0.4)',
                                    color: 'rgba(255, 150, 150, 1)'
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};
