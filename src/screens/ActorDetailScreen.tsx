import { FC, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Stage } from '../Stage';
import { v4 as generateUuid } from 'uuid';
import { Actor, generateBaseActorImage, generateEmotionImage, VOICE_MAP, Appearance } from '../content/Actor';
import { Emotion, EMOTION_PROMPTS } from '../content/Emotion';
import { Close, Save, Image as ImageIcon } from '@mui/icons-material';
import { Button, Chip, GlassPanel, TextInput, Title } from './UiComponents';

interface ActorDetailScreenProps {
    actor: Actor;
    stage: () => Stage;
    onClose: () => void;
}

const ORIGINAL_APPEARANCE_NAME = 'Original Outfit';

export const ActorDetailScreen: FC<ActorDetailScreenProps> = ({ actor, stage, onClose }) => {
    type ImageTarget = 'base' | Emotion;
    type BaseRegenSource = 'description' | 'avatar' | `appearance:${string}`;
    const initialAppearanceIdRef = useRef(actor.appearanceId);

    const getClonedAppearances = (): Appearance[] => {
        const sourceAppearances = Array.isArray(actor.appearances) && actor.appearances.length > 0
            ? actor.appearances
            : [{
                id: actor.appearanceId || generateUuid(),
                name: ORIGINAL_APPEARANCE_NAME,
                description: 'This is the default appearance for the actor, generated from their description and avatar. Edit the description or upload a custom avatar to change this appearance.',
                emotionPack: {},
            }];

        return sourceAppearances.map((appearance) => ({
            ...appearance,
            emotionPack: { ...(appearance.emotionPack || {}) },
        }));
    };

    // Local state for editable fields
    const [editedActor, setEditedActor] = useState<{
        name: string;
        profile: string;
        characterArc: string;
        voiceId: string;
        themeColor: string;
        themeFontFamily: string;
    }>({
        name: actor.name,
        profile: actor.profile,
        characterArc: actor.characterArc || '',
        voiceId: actor.voiceId,
        themeColor: actor.themeColor,
        themeFontFamily: actor.themeFontFamily,
    });
    const [editedAppearances, setEditedAppearances] = useState<Appearance[]>(() => getClonedAppearances());
    const [selectedAppearanceId, setSelectedAppearanceId] = useState<string>(() => {
        const appearances = getClonedAppearances();
        if (actor.appearanceId && appearances.some((appearance) => appearance.id === actor.appearanceId)) {
            return actor.appearanceId;
        }
        return appearances[0]?.id || '';
    });

    const [isSaving, setIsSaving] = useState(false);
    const [regeneratingImages, setRegeneratingImages] = useState<Set<string>>(new Set());
    const [, forceUpdate] = useState({});
    const imageUploadInputRef = useRef<HTMLInputElement>(null);
    const [imageDialog, setImageDialog] = useState<{
        open: boolean;
        target: ImageTarget | null;
    }>({ open: false, target: null });
    const [baseRegenSource, setBaseRegenSource] = useState<BaseRegenSource>(() => (actor.avatarImageUrl ? 'avatar' : 'description'));
    const [emotionPromptDraft, setEmotionPromptDraft] = useState('');
    const [isImageDropActive, setIsImageDropActive] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>;
        onConfirm?: () => void;
    }>({ open: false, title: '', message: '' });
    const initialAppearancesRef = useRef<Appearance[]>(getClonedAppearances());

    useEffect(() => {
        actor.appearances = editedAppearances;
    }, [actor, editedAppearances]);

    const selectedAppearance = editedAppearances.find((appearance) => appearance.id === selectedAppearanceId) || editedAppearances[0] || null;
    const getSelectedAppearanceImageUrl = (emotion: Emotion | 'base'): string => selectedAppearance?.emotionPack?.[emotion] || '';

    const syncEditedAppearancesFromActor = () => {
        setEditedAppearances(actor.appearances.map((appearance) => ({
            ...appearance,
            emotionPack: { ...(appearance.emotionPack || {}) },
        })));
    };

    const handleCloseDetail = () => {
        actor.appearances = initialAppearancesRef.current.map((appearance) => ({
            ...appearance,
            emotionPack: { ...(appearance.emotionPack || {}) },
        }));
        actor.appearanceId = initialAppearanceIdRef.current;
        onClose();
    };

    const handleSave = () => {
        setIsSaving(true);

        const nextAppearances = editedAppearances.length > 0
            ? editedAppearances
            : [{
                id: generateUuid(),
                name: ORIGINAL_APPEARANCE_NAME,
                description: '',
                emotionPack: {},
            }];

        // Update the actor in the save
        actor.name = editedActor.name;
        actor.profile = editedActor.profile;
        actor.characterArc = editedActor.characterArc;
        actor.voiceId = editedActor.voiceId;
        actor.themeColor = editedActor.themeColor;
        actor.themeFontFamily = editedActor.themeFontFamily;
        actor.appearances = nextAppearances.map((appearance) => ({
            ...appearance,
            emotionPack: { ...(appearance.emotionPack || {}) },
        }));
        initialAppearancesRef.current = actor.appearances.map((appearance) => ({
            ...appearance,
            emotionPack: { ...(appearance.emotionPack || {}) },
        }));

        // Save the game
        stage().saveGame();
        
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleInputChange = (field: string, value: string | number) => {
        setEditedActor(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAppearanceChange = (field: 'name' | 'description', value: string) => {
        if (!selectedAppearanceId) return;
        setEditedAppearances((prev) => prev.map((appearance) => (
            appearance.id === selectedAppearanceId
                ? { ...appearance, [field]: value }
                : appearance
        )));
    };

    const handleSelectAppearance = (appearanceId: string) => {
        setSelectedAppearanceId(appearanceId);
    };

    const getNextAppearanceName = (): string => {
        let nextIndex = editedAppearances.length + 1;
        let candidate = `Appearance ${nextIndex}`;
        const usedNames = new Set(editedAppearances.map((appearance) => appearance.name.toLowerCase()));
        while (usedNames.has(candidate.toLowerCase())) {
            nextIndex += 1;
            candidate = `Appearance ${nextIndex}`;
        }
        return candidate;
    };

    const handleCreateAppearance = () => {
        const newAppearance: Appearance = {
            id: generateUuid(),
            name: getNextAppearanceName(),
            description: '',
            emotionPack: {},
        };
        setEditedAppearances((prev) => [...prev, newAppearance]);
        setSelectedAppearanceId(newAppearance.id);
    };

    const handleDeleteAppearance = () => {
        if (!selectedAppearance || editedAppearances.length <= 1) {
            return;
        }

        if (selectedAppearance.id === actor.appearanceId) {
            console.warn('Cannot delete the actor\'s currently selected appearance.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: `Delete Appearance: ${selectedAppearance.name}`,
            message: 'This will remove the selected appearance and all of its emotion images. This cannot be undone. Continue?',
            actions: [
                {
                    label: 'Delete Appearance',
                    onClick: () => {
                        setConfirmDialog((prev) => ({ ...prev, open: false }));
                        setEditedAppearances((prev) => {
                            const next = prev.filter((appearance) => appearance.id !== selectedAppearance.id);
                            const replacement = next[0]?.id || '';
                            setSelectedAppearanceId(replacement);
                            return next;
                        });
                    },
                    variant: 'primary',
                },
            ],
        });
    };

    const handleRegenerateEmotion = async (emotion: Emotion) => {
        if (regeneratingImages.has(emotion)) return;
        
        setConfirmDialog({
            open: true,
            title: `Regenerate ${emotion} Image`,
            message: `This will regenerate the ${emotion} emotion image and replace the existing one. Continue?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setRegeneratingImages(prev => new Set(prev).add(emotion));
                
                try {
                    await generateEmotionImage(actor, emotion, stage(), true, selectedAppearanceId);
                    syncEditedAppearancesFromActor();
                    // Force a re-render to show the new image
                    forceUpdate({});
                } catch (error) {
                    console.error(`Failed to regenerate ${emotion} emotion:`, error);
                    stage().showPriorityMessage(`Failed to regenerate ${emotion} emotion. Check console for details.`);
                } finally {
                    setRegeneratingImages(prev => {
                        const next = new Set(prev);
                        next.delete(emotion);
                        return next;
                    });
                }
            }
        });
    };

    const getEmotionPrompt = (emotion: Emotion): string => {
        return stage().getSave().emotionPrompts?.[emotion] || EMOTION_PROMPTS[emotion];
    };

    const persistEmotionPrompt = (emotion: Emotion, prompt: string) => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            stage().showPriorityMessage('Emotion prompt cannot be empty.');
            return false;
        }

        const save = stage().getSave();
        save.emotionPrompts = {
            ...(save.emotionPrompts || EMOTION_PROMPTS),
            [emotion]: trimmedPrompt,
        };
        stage().saveGame();
        return true;
    };

    const handleOpenImageDialog = (target: ImageTarget) => {
        setImageDialog({ open: true, target });
        if (target === 'base') {
            setBaseRegenSource(actor.avatarImageUrl ? 'avatar' : 'description');
            setEmotionPromptDraft('');
        } else {
            setEmotionPromptDraft(getEmotionPrompt(target));
        }
        setIsImageDropActive(false);
    };

    const handleCloseImageDialog = () => {
        setImageDialog({ open: false, target: null });
        setIsImageDropActive(false);
    };

    const handleImageFile = async (file: File, target: ImageTarget) => {
        if (!file.type.startsWith('image/')) {
            stage().showPriorityMessage('Please select a valid image file.');
            return;
        }

        if (!selectedAppearanceId) {
            stage().showPriorityMessage('Select an appearance before uploading images.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const uploadedUrl = await stage().uploadFile(`${actor.id}-${selectedAppearanceId}-${target}.png`, file);
            const nextAppearances = editedAppearances.map((appearance) => (
                appearance.id === selectedAppearanceId
                    ? {
                        ...appearance,
                        emotionPack: {
                            ...(appearance.emotionPack || {}),
                            [target]: uploadedUrl,
                        },
                    }
                    : appearance
            ));
            setEditedAppearances(nextAppearances);
            actor.appearances = nextAppearances.map((appearance) => ({
                ...appearance,
                emotionPack: { ...(appearance.emotionPack || {}) },
            }));
            stage().saveGame();
            forceUpdate({});
        } catch (error) {
            console.error(`Failed to upload ${target} image:`, error);
            stage().showPriorityMessage(`Failed to upload ${target} image. Check console for details.`);
        } finally {
            setIsUploadingImage(false);
            if (imageUploadInputRef.current) {
                imageUploadInputRef.current.value = '';
            }
        }
    };

    const handleRegenerateBase = async (source: BaseRegenSource) => {
        if (regeneratingImages.has('base')) return;

        const hasAvatarUrl = !!actor.avatarImageUrl;
        const sourceAppearanceId = source.startsWith('appearance:') ? source.slice('appearance:'.length) : '';
        const sourceAppearance = editedAppearances.find((appearance) => appearance.id === sourceAppearanceId);
        const sourceImageUrl = sourceAppearance?.emotionPack?.base || '';
        const selectedLabel = source === 'avatar'
            ? 'Original Avatar'
            : source === 'description'
                ? 'Description Only'
                : `Appearance: ${sourceAppearance?.name || 'Unknown Appearance'}`;

        if (source === 'avatar' && !hasAvatarUrl) {
            stage().showPriorityMessage('Original avatar image is not available for this actor.');
            return;
        }

        if (source.startsWith('appearance:') && !sourceImageUrl) {
            stage().showPriorityMessage('The selected appearance does not have a base image.');
            return;
        }

        const regenerateBase = async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            setRegeneratingImages(prev => new Set(prev).add('base'));
            
            try {
                await generateBaseActorImage(
                    actor,
                    stage(),
                    true,
                    source !== 'description',
                    selectedAppearanceId,
                    source.startsWith('appearance:') ? sourceImageUrl : ''
                );
                syncEditedAppearancesFromActor();
                // Force a re-render to show the new image
                forceUpdate({});
            } catch (error) {
                console.error('Failed to regenerate base image:', error);
                stage().showPriorityMessage('Failed to regenerate base image. Check console for details.');
            } finally {
                setRegeneratingImages(prev => {
                    const next = new Set(prev);
                    next.delete('base');
                    return next;
                });
            }
        };

        setConfirmDialog({
            open: true,
            title: 'Regenerate Base Image',
            message: `This will regenerate the base image from ${selectedLabel} and may affect all emotion variations. Continue?`,
            actions: [
                {
                    label: 'Regenerate',
                    onClick: regenerateBase,
                    variant: 'primary'
                }
            ]
        });
    };

    // Get all emotions for the grid
    const allEmotions = Object.values(Emotion);

    const currentImageUrl = imageDialog.target ? getSelectedAppearanceImageUrl(imageDialog.target as Emotion | 'base') : '';
    const isCurrentImageRegenerating = imageDialog.target ? regeneratingImages.has(imageDialog.target) : false;
    const imageTargetLabel = imageDialog.target || '';
    const imageTargetAppearanceName = selectedAppearance?.name || 'Appearance';
    const baseRegenAppearanceOptions = editedAppearances.filter((appearance) => !!appearance.emotionPack?.base);
    const baseRegenOptions: Array<{ value: BaseRegenSource; label: string }> = [
        ...(actor.avatarImageUrl ? [{ value: 'avatar' as BaseRegenSource, label: 'Original Avatar' }] : []),
        { value: 'description' as BaseRegenSource, label: 'Description Only' },
        ...baseRegenAppearanceOptions.map((appearance) => ({
            value: `appearance:${appearance.id}` as BaseRegenSource,
            label: `Appearance: ${appearance.name}`,
        })),
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 10, 20, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}
                onClick={(e) => {
                    // Close if clicking backdrop
                    // Don't close if user is selecting text
                    const selection = window.getSelection();
                    const hasSelection = selection && selection.toString().length > 0;
                    
                    if (e.target === e.currentTarget && !hasSelection) {
                        handleCloseDetail();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '90vw',
                        maxWidth: '1400px',
                        maxHeight: '90vh',
                    }}
                >
                    <GlassPanel 
                        variant="bright"
                        style={{
                            height: '90vh',
                            overflow: 'auto',
                            position: 'relative',
                            padding: '30px',
                        }}
                    >
                        {/* Header with close button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                            position: 'sticky',
                            top: 0,
                            background: 'rgba(0, 20, 40, 0.95)',
                            backdropFilter: 'blur(8px)',
                            padding: '10px 0',
                            zIndex: 10,
                        }}>
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                Actor Details: {editedActor.name}
                            </Title>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Save style={{ fontSize: '20px' }} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleCloseDetail}
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
                        </div>

                        {/* Form Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            
                            {/* Basic Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Basic Information
                                </h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {/* Name */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Name
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedActor.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Character name"
                                        />
                                    </div>

                                    {/* Profile/Personality */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Personality Profile
                                        </label>
                                        <textarea
                                            value={editedActor.profile}
                                            onChange={(e) => handleInputChange('profile', e.target.value)}
                                            placeholder="Key personality traits and behaviors"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Character Arc */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Character Arc
                                        </label>
                                        <textarea
                                            value={editedActor.characterArc}
                                            onChange={(e) => handleInputChange('characterArc', e.target.value)}
                                            placeholder="Character arc over this narrative"
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Theme & Voice Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Theme & Voice
                                </h2>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {/* Voice ID */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Voice ID
                                        </label>
                                        <select
                                            value={editedActor.voiceId}
                                            onChange={(e) => handleInputChange('voiceId', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {Object.entries(VOICE_MAP).map(([id, description]) => (
                                                <option key={id} value={id}>
                                                    {description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Theme Color */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Theme Color
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TextInput
                                                value={editedActor.themeColor}
                                                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                                                placeholder="#RRGGBB"
                                                style={{ flex: 1 }}
                                            />
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '38px',
                                                    backgroundColor: editedActor.themeColor,
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Font Family */}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Font Family
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedActor.themeFontFamily}
                                            onChange={(e) => handleInputChange('themeFontFamily', e.target.value)}
                                            placeholder="Font stack (e.g., Arial, sans-serif)"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Appearance Section */}
                            <section>
                                <h2 style={{
                                    color: '#00ff88',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Appearance
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '15px' }}>
                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Selected Appearance
                                            </label>
                                            <select
                                                value={selectedAppearance?.id || ''}
                                                onChange={(e) => handleSelectAppearance(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    color: '#e0f0ff',
                                                    fontFamily: 'inherit',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {editedAppearances.map((appearance) => (
                                                    <option key={appearance.id} value={appearance.id}>
                                                        {appearance.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Appearance Name
                                            </label>
                                            <TextInput
                                                fullWidth
                                                value={selectedAppearance?.name || ''}
                                                onChange={(e) => handleAppearanceChange('name', e.target.value)}
                                                placeholder="Appearance name"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Button onClick={handleCreateAppearance}>
                                            New Appearance
                                        </Button>
                                        <Button
                                            onClick={handleDeleteAppearance}
                                            variant="secondary"
                                            disabled={editedAppearances.length <= 1 || selectedAppearance?.id === actor.appearanceId}
                                        >
                                            Delete Appearance
                                        </Button>
                                    </div>

                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Appearance Description
                                        </label>
                                        <textarea
                                            value={selectedAppearance?.description || ''}
                                            onChange={(e) => handleAppearanceChange('description', e.target.value)}
                                            placeholder="Physical appearance, attire, and distinguishing features for this appearance"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Emotion Images Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <ImageIcon />
                                    Emotion Images ({selectedAppearance?.name || 'Appearance'})
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                    gap: '15px' 
                                }}>
                                    {/* Base Image */}
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleOpenImageDialog('base')}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                backgroundColor: getSelectedAppearanceImageUrl('base') ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                                border: `2px solid ${getSelectedAppearanceImageUrl('base') ? 'rgba(255, 136, 0, 0.5)' : 'rgba(0, 255, 136, 0.2)'}`,
                                                borderRadius: '8px',
                                                backgroundImage: getSelectedAppearanceImageUrl('base') ? `url(${getSelectedAppearanceImageUrl('base')})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center top',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {!getSelectedAppearanceImageUrl('base') && (
                                                <div style={{
                                                    color: 'rgba(0, 255, 136, 0.3)',
                                                    fontSize: '12px',
                                                    textAlign: 'center',
                                                    padding: '10px'
                                                }}>
                                                    Not Generated
                                                </div>
                                            )}
                                            {regeneratingImages.has('base') && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#00ff88',
                                                    fontSize: '12px',
                                                }}>
                                                    Generating...
                                                </div>
                                            )}
                                        </div>
                                        <Chip style={{
                                            fontSize: '11px',
                                            textTransform: 'capitalize',
                                            backgroundColor: 'rgba(255, 136, 0, 0.2)',
                                        }}>
                                            Base
                                        </Chip>
                                    </motion.div>

                                    {/* Emotion Images */}
                                    {allEmotions.map(emotion => {
                                        const imageUrl = getSelectedAppearanceImageUrl(emotion);
                                        const hasImage = !!imageUrl;
                                        const isRegenerating = regeneratingImages.has(emotion);
                                        
                                        return (
                                            <motion.div
                                                key={emotion}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleOpenImageDialog(emotion)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '120px',
                                                        height: '120px',
                                                        backgroundColor: hasImage ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                                        border: `2px solid ${hasImage ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 255, 136, 0.2)'}`,
                                                        borderRadius: '8px',
                                                        backgroundImage: hasImage ? `url(${imageUrl})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center top',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {!hasImage && (
                                                        <div style={{
                                                            color: 'rgba(0, 255, 136, 0.3)',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            padding: '10px'
                                                        }}>
                                                            Not Generated
                                                        </div>
                                                    )}
                                                    {isRegenerating && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#00ff88',
                                                            fontSize: '12px',
                                                        }}>
                                                            Generating...
                                                        </div>
                                                    )}
                                                </div>
                                                <Chip style={{
                                                    fontSize: '11px',
                                                    textTransform: 'capitalize',
                                                    backgroundColor: hasImage ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 20, 40, 0.6)',
                                                }}>
                                                    {emotion}
                                                </Chip>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Read-only Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Additional Information
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '15px',
                                    backgroundColor: 'rgba(0, 20, 40, 0.4)',
                                    padding: '15px',
                                    borderRadius: '5px',
                                    border: '1px solid rgba(0, 255, 136, 0.2)',
                                }}>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Actor ID
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px', fontFamily: 'monospace' }}>
                                            {actor.id}
                                        </div>
                                    </div>
                                    {actor.fullPath && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                                Source Path
                                            </div>
                                            <div style={{ 
                                                color: '#e0f0ff', 
                                                fontSize: '12px', 
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all'
                                            }}>
                                                {actor.fullPath}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>

            {/* Confirmation Dialog */}
            <Dialog
                open={imageDialog.open}
                onClose={handleCloseImageDialog}
                slotProps={{
                    paper: {
                        style: {
                            backgroundColor: 'rgba(0, 20, 40, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '2px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '8px',
                            color: '#e0f0ff',
                            minWidth: '700px',
                            maxWidth: '900px',
                        }
                    }
                }}
            >
                <DialogTitle style={{
                    color: '#00ff88',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                    paddingBottom: '10px',
                    textTransform: 'capitalize',
                }}>
                    Manage {imageTargetLabel} Image - {imageTargetAppearanceName}
                </DialogTitle>
                <DialogContent style={{ paddingTop: '20px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        alignItems: 'stretch'
                    }}>
                        <div style={{ display: 'flex' }}>
                            <input
                                ref={imageUploadInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const target = imageDialog.target;
                                    const file = e.target.files?.[0];
                                    if (!target || !file) return;
                                    handleImageFile(file, target);
                                }}
                            />
                            <div
                                onClick={() => imageUploadInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsImageDropActive(true);
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    setIsImageDropActive(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsImageDropActive(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsImageDropActive(false);
                                    const target = imageDialog.target;
                                    const file = e.dataTransfer.files?.[0];
                                    if (!target || !file) return;
                                    handleImageFile(file, target);
                                }}
                                style={{
                                    width: '100%',
                                    minHeight: '360px',
                                    height: '100%',
                                    backgroundColor: currentImageUrl ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                    border: `2px dashed ${isImageDropActive ? 'rgba(0, 255, 136, 0.8)' : 'rgba(0, 255, 136, 0.35)'}`,
                                    borderRadius: '8px',
                                    backgroundImage: currentImageUrl ? `url(${currentImageUrl})` : 'none',
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {!currentImageUrl && (
                                    <div style={{
                                        color: 'rgba(0, 255, 136, 0.5)',
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        padding: '16px',
                                        lineHeight: 1.5,
                                    }}>
                                        Click to upload image
                                        <br />
                                        or drag and drop here
                                    </div>
                                )}

                                {isImageDropActive && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 255, 136, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#00ff88',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                    }}>
                                        Drop to Replace
                                    </div>
                                )}

                                {isUploadingImage && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                    }}>
                                        Uploading...
                                    </div>
                                )}

                                {isCurrentImageRegenerating && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                    }}>
                                        Generating...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '360px' }}>
                            <div style={{
                                color: '#e0f0ff',
                                fontSize: '14px',
                                lineHeight: 1.6,
                            }}>
                                Click the image area to select a file, or drag and drop an image to replace the current {String(imageTargetLabel).toLowerCase()} image for {imageTargetAppearanceName}.
                            </div>
                            {imageDialog.target === 'base' && (
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            color: '#00ff88',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        Regenerate Source
                                    </label>
                                    <select
                                        value={baseRegenSource}
                                        onChange={(e) => setBaseRegenSource(e.target.value as BaseRegenSource)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            fontSize: '14px',
                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                            borderRadius: '5px',
                                            color: '#e0f0ff',
                                            fontFamily: 'inherit',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {baseRegenOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {imageDialog.target && imageDialog.target !== 'base' && (
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            color: '#00ff88',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        Emotion Prompt
                                    </label>
                                    <textarea
                                        value={emotionPromptDraft}
                                        onChange={(e) => setEmotionPromptDraft(e.target.value)}
                                        placeholder="Give this character ..."
                                        style={{
                                            width: '100%',
                                            minHeight: '120px',
                                            padding: '12px',
                                            fontSize: '13px',
                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                            borderRadius: '5px',
                                            color: '#e0f0ff',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                            lineHeight: 1.5,
                                        }}
                                    />
                                </div>
                            )}
                            <Button
                                onClick={() => {
                                    const target = imageDialog.target;
                                    if (!target) return;
                                    if (target === 'base') {
                                        handleRegenerateBase(baseRegenSource);
                                    } else {
                                        if (!persistEmotionPrompt(target, emotionPromptDraft)) {
                                            return;
                                        }
                                        handleRegenerateEmotion(target);
                                    }
                                }}
                                disabled={!imageDialog.target || isCurrentImageRegenerating}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {isCurrentImageRegenerating ? 'Generating...' : 'Regenerate Image'}
                            </Button>
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={handleCloseImageDialog} variant="secondary">
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                slotProps={{
                    paper: {
                        style: {
                            backgroundColor: 'rgba(0, 20, 40, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '2px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '8px',
                            color: '#e0f0ff',
                            minWidth: '400px',
                        }
                    }
                }}
            >
                <DialogTitle style={{
                    color: '#00ff88',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                    paddingBottom: '10px',
                }}>
                    {confirmDialog.title}
                </DialogTitle>
                <DialogContent style={{ paddingTop: '20px' }}>
                    <div style={{
                        color: '#e0f0ff',
                        fontSize: '14px',
                        lineHeight: '1.6',
                    }}>
                        {confirmDialog.message}
                    </div>
                </DialogContent>
                <DialogActions style={{ padding: '15px 20px', display: 'flex', gap: '10px' }}>
                    <Button
                        onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    {confirmDialog.actions ? (
                        confirmDialog.actions.map((action, index) => (
                            <Button
                                key={index}
                                onClick={action.onClick}
                                variant={action.variant || 'primary'}
                            >
                                {action.label}
                            </Button>
                        ))
                    ) : (
                        <Button
                            onClick={confirmDialog.onConfirm}
                            variant="primary"
                        >
                            Regenerate
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </AnimatePresence>
    );
};
