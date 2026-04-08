import { FC, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Stage } from '../Stage';
import { v4 as generateUuid } from 'uuid';
import { Actor, ActorState, clampActorAffinity, generateBaseActorImage, generateEmotionImage, generateOutfitEmotionPrompt, VOICE_MAP, Outfit, getActorProfile, updateActorProfile } from '../content/Actor';
import { Emotion } from '../content/Emotion';
import { Close, Save, Image as ImageIcon, ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import { Button, Chip, GlassPanel, TextInput, Title } from './UiComponents';

interface ActorDetailScreenProps {
    actor: Actor;
    stage: () => Stage;
    onClose: () => void;
}

const ORIGINAL_OUTFIT_NAME = 'Original Outfit';

export const ActorDetailScreen: FC<ActorDetailScreenProps> = ({ actor, stage, onClose }) => {
    type ImageTarget = 'base' | Emotion;
    type BaseRegenSource = 'description' | 'original sample' | `outfit:${string}`;
    const initialOutfitIdRef = useRef(actor.outfitId);

    const getClonedOutfits = (): Outfit[] => {
        const sourceOutfits: Outfit[] = Array.isArray(actor.outfits) && actor.outfits.length > 0
            ? actor.outfits
            : [{
                id: actor.outfitId || generateUuid(),
                name: ORIGINAL_OUTFIT_NAME,
                description: 'This is the default outfit for the actor, generated from their description and avatar. Edit the description or upload a custom avatar to change this outfit.',
                prompts: {},
                emotionPack: {},
            }];

        return sourceOutfits.map((outfit) => ({
            ...outfit,
            prompts: { ...(outfit.prompts || {}) },
            emotionPack: { ...(outfit.emotionPack || {}) },
        }));
    };

    // Local state for editable fields
    const [editedActor, setEditedActor] = useState<{
        name: string;
        description: string;
        profile: string;
        affinity: number;
        state: ActorState;
        voiceId: string;
        themeColor: string;
        themeFontFamily: string;
    }>({
        name: actor.name,
        description: actor.description || '',
        profile: getActorProfile(actor.id, stage()),
        affinity: clampActorAffinity(actor.affinity),
        state: actor.state || ActorState.AVAILABLE,
        voiceId: actor.voiceId,
        themeColor: actor.themeColor,
        themeFontFamily: actor.themeFontFamily,
    });
    const [editedOutfits, setEditedOutfits] = useState<Outfit[]>(() => getClonedOutfits());
    const [selectedOutfitId, setSelectedOutfitId] = useState<string>(() => {
        const outfits = getClonedOutfits();
        if (actor.outfitId && outfits.some((outfit) => outfit.id === actor.outfitId)) {
            return actor.outfitId;
        }
        return outfits[0]?.id || '';
    });

    const [isSaving, setIsSaving] = useState(false);
    const [regeneratingImages, setRegeneratingImages] = useState<Set<string>>(new Set());
    const [isFillingMissingEmotions, setIsFillingMissingEmotions] = useState(false);
    const [, forceUpdate] = useState({});
    const imageUploadInputRef = useRef<HTMLInputElement>(null);
    const [imageDialog, setImageDialog] = useState<{
        open: boolean;
        target: ImageTarget | null;
    }>({ open: false, target: null });
    const [baseRegenSource, setBaseRegenSource] = useState<BaseRegenSource>(() => (actor.sampleImageUrl ? 'original sample' : 'description'));
    const [emotionPromptDraft, setEmotionPromptDraft] = useState('');
    const [isImageDropActive, setIsImageDropActive] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [outfitsObjectExport, setOutfitsObjectExport] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>;
        onConfirm?: () => void;
    }>({ open: false, title: '', message: '' });
    const initialOutfitsRef = useRef<Outfit[]>(getClonedOutfits());

    const cloneOutfits = (outfits: Outfit[]) => outfits.map((outfit) => ({
        ...outfit,
        prompts: { ...(outfit.prompts || {}) },
        emotionPack: { ...(outfit.emotionPack || {}) },
    }));

    useEffect(() => {
        actor.outfits = editedOutfits;
    }, [actor, editedOutfits]);

    const selectedOutfit = editedOutfits.find((outfit) => outfit.id === selectedOutfitId) || editedOutfits[0] || null;
    const getSelectedOutfitImageUrl = (emotion: Emotion | 'base'): string => selectedOutfit?.emotionPack?.[emotion] || '';

    const syncEditedOutfitsFromActor = () => {
        setEditedOutfits(cloneOutfits(actor.outfits));
    };

    const replaceOutfits = (nextOutfits: Outfit[]) => {
        setEditedOutfits(nextOutfits);
        actor.outfits = cloneOutfits(nextOutfits);
    };

    const updateEmotionPrompt = (emotion: Emotion, prompt: string): string => {
        if (!selectedOutfitId) {
            return prompt.trim();
        }

        const trimmedPrompt = prompt.trim();
        const nextOutfits = editedOutfits.map((outfit) => (
            outfit.id === selectedOutfitId
                ? {
                    ...outfit,
                    prompts: {
                        ...(outfit.prompts || {}),
                        [emotion]: trimmedPrompt,
                    },
                }
                : outfit
        ));
        replaceOutfits(nextOutfits);
        return trimmedPrompt;
    };

    const handleCloseDetail = () => {
        actor.outfits = initialOutfitsRef.current.map((outfit) => ({
            ...outfit,
            prompts: { ...(outfit.prompts || {}) },
            emotionPack: { ...(outfit.emotionPack || {}) },
        }));
        actor.outfitId = initialOutfitIdRef.current;
        onClose();
    };

    const handleSave = () => {
        setIsSaving(true);

        const nextOutfits = editedOutfits.length > 0
            ? editedOutfits
            : [{
                id: generateUuid(),
                name: ORIGINAL_OUTFIT_NAME,
                description: '',
                prompts: {},
                emotionPack: {},
            }];

        // Update the actor in the save
        actor.name = editedActor.name;
        actor.description = editedActor.description;
        updateActorProfile(actor.id, editedActor.profile, stage());
        actor.affinity = clampActorAffinity(editedActor.affinity);
        actor.state = editedActor.state;
        actor.voiceId = editedActor.voiceId;
        actor.themeColor = editedActor.themeColor;
        actor.themeFontFamily = editedActor.themeFontFamily;
        actor.outfits = nextOutfits.map((outfit) => ({
            ...outfit,
            prompts: { ...(outfit.prompts || {}) },
            emotionPack: { ...(outfit.emotionPack || {}) },
        }));
        initialOutfitsRef.current = actor.outfits.map((outfit) => ({
            ...outfit,
            prompts: { ...(outfit.prompts || {}) },
            emotionPack: { ...(outfit.emotionPack || {}) },
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
            [field]: field === 'affinity' ? clampActorAffinity(Number(value)) : value
        }));
    };

    const handleOutfitChange = (field: 'name' | 'description', value: string) => {
        if (!selectedOutfitId) return;
        setEditedOutfits((prev) => prev.map((outfit) => (
            outfit.id === selectedOutfitId
                ? { ...outfit, [field]: value }
                : outfit
        )));
    };

    const handleSelectOutfit = (outfitId: string) => {
        setSelectedOutfitId(outfitId);
    };

    const getNextOutfitName = (): string => {
        let nextIndex = editedOutfits.length + 1;
        let candidate = `Outfit ${nextIndex}`;
        const usedNames = new Set(editedOutfits.map((outfit) => outfit.name.toLowerCase()));
        while (usedNames.has(candidate.toLowerCase())) {
            nextIndex += 1;
            candidate = `Outfit ${nextIndex}`;
        }
        return candidate;
    };

    const handleCreateOutfit = () => {
        const newOutfit: Outfit = {
            id: generateUuid(),
            name: getNextOutfitName(),
            description: '',
            prompts: {},
            emotionPack: {},
        };
        setEditedOutfits((prev) => [...prev, newOutfit]);
        setSelectedOutfitId(newOutfit.id);
    };

    const handleDeleteOutfit = () => {
        if (!selectedOutfit || editedOutfits.length <= 1) {
            return;
        }

        if (selectedOutfit.id === actor.outfitId) {
            console.warn('Cannot delete the actor\'s currently selected outfit.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: `Delete Outfit: ${selectedOutfit.name}`,
            message: 'This will remove the selected outfit and all of its emotion images. This cannot be undone. Continue?',
            actions: [
                {
                    label: 'Delete Outfit',
                    onClick: () => {
                        setConfirmDialog((prev) => ({ ...prev, open: false }));
                        setEditedOutfits((prev) => {
                            const next = prev.filter((outfit) => outfit.id !== selectedOutfit.id);
                            const replacement = next[0]?.id || '';
                            setSelectedOutfitId(replacement);
                            return next;
                        });
                    },
                    variant: 'primary',
                },
            ],
        });
    };

    const buildOutfitsExport = () => ({
        outfits: editedOutfits.map((outfit) => ({
            id: outfit.name,
            name: outfit.name,
            description: outfit.description,
            prompts: { ...(outfit.prompts || {}) },
            emotionPack: { ...(outfit.emotionPack || {}) },
        })),
    });

    const formatAsJavascriptObject = (value: unknown, indentLevel = 0): string => {
        const indent = '  '.repeat(indentLevel);
        const childIndent = '  '.repeat(indentLevel + 1);

        if (value === null) return 'null';
        if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            const items = value.map((item) => `${childIndent}${formatAsJavascriptObject(item, indentLevel + 1)}`);
            return `[
${items.join(',\n')}
${indent}]`;
        }

        if (typeof value === 'object') {
            const entries = Object.entries(value as Record<string, unknown>);
            if (entries.length === 0) return '{}';

            const objectEntries = entries.map(([key, entryValue]) => {
                const isValidIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
                const displayKey = isValidIdentifier ? key : `'${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                return `${childIndent}${displayKey}: ${formatAsJavascriptObject(entryValue, indentLevel + 1)}`;
            });

            return `{
${objectEntries.join(',\n')}
${indent}}`;
        }

        return 'undefined';
    };

    const handleGenerateOutfitsExport = () => {
        setOutfitsObjectExport(formatAsJavascriptObject(buildOutfitsExport()));
    };

    const handleRegenerateEmotion = async (emotion: Emotion, promptDraft: string) => {
        if (regeneratingImages.has(emotion)) return;
        
        setConfirmDialog({
            open: true,
            title: `Regenerate ${emotion} Image`,
            message: `This will regenerate the ${emotion} emotion image and replace the existing one. Continue?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));

                if (!await persistEmotionPrompt(emotion, promptDraft)) {
                    return;
                }

                setRegeneratingImages(prev => new Set(prev).add(emotion));
                
                try {
                    console.log('Regenerating emotion image with prompt:', getEmotionPrompt(emotion));
                    await generateEmotionImage(actor, emotion, stage(), true, selectedOutfitId);
                    syncEditedOutfitsFromActor();
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
        return selectedOutfit?.prompts?.[emotion] || '';
    };

    const persistEmotionPrompt = async (emotion: Emotion, prompt: string) => {
        if (!selectedOutfitId) {
            stage().showPriorityMessage('Select an outfit before editing prompts.');
            return false;
        }

        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            try {
                const generatedPrompt = await generateOutfitEmotionPrompt(actor, emotion, stage(), selectedOutfitId);
                if (!generatedPrompt) {
                    stage().showPriorityMessage('Failed to generate an emotion prompt.');
                    return false;
                }
                syncEditedOutfitsFromActor();
                setEmotionPromptDraft(generatedPrompt);
                forceUpdate({});
                return true;
            } catch (error) {
                console.error(`Failed to generate ${emotion} prompt:`, error);
                stage().showPriorityMessage(`Failed to generate ${emotion} prompt. Check console for details.`);
                return false;
            }
        }

        updateEmotionPrompt(emotion, trimmedPrompt);
        stage().saveGame();
        return true;
    };

    const handleEmotionPromptDraftChange = (value: string) => {
        setEmotionPromptDraft(value);

        const target = imageDialog.target;
        if (target && target !== 'base') {
            updateEmotionPrompt(target, value);
        }
    };

    const handleOpenImageDialog = (target: ImageTarget) => {
        setImageDialog({ open: true, target });
        if (target === 'base') {
            setBaseRegenSource(actor.sampleImageUrl ? 'original sample' : 'description');
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

        if (!selectedOutfitId) {
            stage().showPriorityMessage('Select an outfit before uploading images.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const uploadedUrl = await stage().uploadFile(`${actor.id}-${selectedOutfitId}-${target}.png`, file);
            const nextOutfits = editedOutfits.map((outfit) => (
                outfit.id === selectedOutfitId
                    ? {
                        ...outfit,
                        prompts: { ...(outfit.prompts || {}) },
                        emotionPack: {
                            ...(outfit.emotionPack || {}),
                            [target]: uploadedUrl,
                        },
                    }
                    : outfit
            ));
            setEditedOutfits(nextOutfits);
            actor.outfits = nextOutfits.map((outfit) => ({
                ...outfit,
                prompts: { ...(outfit.prompts || {}) },
                emotionPack: { ...(outfit.emotionPack || {}) },
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

        const hasOriginalSample = !!actor.sampleImageUrl;
        const sourceOutfitId = source.startsWith('outfit:') ? source.slice('outfit:'.length) : '';
        const sourceOutfit = editedOutfits.find((outfit) => outfit.id === sourceOutfitId);
        const sourceImageUrl = sourceOutfit?.emotionPack?.base || '';
        const selectedLabel = source === 'original sample'
            ? 'Original Sample Image'
            : source === 'description'
                ? 'Description Only'
                : `Outfit: ${sourceOutfit?.name || 'Unknown Outfit'}`;

        if (source === 'original sample' && !hasOriginalSample) {
            stage().showPriorityMessage('Original sample is not available for this actor.');
            return;
        }

        if (source.startsWith('outfit:') && !sourceImageUrl) {
            stage().showPriorityMessage('The selected outfit does not have an original sample.');
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
                    selectedOutfitId,
                    source.startsWith('outfit:') ? sourceImageUrl : ''
                );
                syncEditedOutfitsFromActor();
                // Force a re-render to show the new image
                forceUpdate({});
            } catch (error) {
                console.error('Failed to regenerate original sample:', error);
                stage().showPriorityMessage('Failed to regenerate original sample. Check console for details.');
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
            title: 'Regenerate original sample',
            message: `This will regenerate the original sample from ${selectedLabel} and may affect all emotion variations. Continue?`,
            actions: [
                {
                    label: 'Regenerate',
                    onClick: regenerateBase,
                    variant: 'primary'
                }
            ]
        });
    };

    const handleDeleteEmotionImage = (emotion: Emotion) => {
        if (!selectedOutfitId) {
            stage().showPriorityMessage('Select an outfit before deleting emotion images.');
            return;
        }

        if (!selectedOutfit?.emotionPack?.[emotion]) {
            stage().showPriorityMessage(`No ${emotion} image to delete.`);
            return;
        }

        setConfirmDialog({
            open: true,
            title: `Delete ${emotion} Image`,
            message: `This will remove the ${emotion} image for ${selectedOutfit?.name || 'the selected outfit'}. Continue?`,
            actions: [
                {
                    label: 'Delete Image',
                    onClick: () => {
                        setConfirmDialog((prev) => ({ ...prev, open: false }));
                        const nextOutfits = editedOutfits.map((outfit) => (
                            outfit.id === selectedOutfitId
                                ? {
                                    ...outfit,
                                    prompts: { ...(outfit.prompts || {}) },
                                    emotionPack: {
                                        ...(outfit.emotionPack || {}),
                                        [emotion]: '',
                                    },
                                }
                                : outfit
                        ));

                        setEditedOutfits(nextOutfits);
                        actor.outfits = nextOutfits.map((outfit) => ({
                            ...outfit,
                            prompts: { ...(outfit.prompts || {}) },
                            emotionPack: { ...(outfit.emotionPack || {}) },
                        }));
                        stage().saveGame();
                        forceUpdate({});
                    },
                    variant: 'primary',
                },
            ],
        });
    };

    // Get all emotions for the grid
    const allEmotions = Object.values(Emotion);
    const missingEmotionCount = allEmotions.filter((emotion) => !selectedOutfit?.emotionPack?.[emotion]).length;

    const cycleDialogEmotion = (direction: -1 | 1) => {
        const target = imageDialog.target;
        if (!target || target === 'base' || allEmotions.length < 2) {
            return;
        }

        const currentIndex = allEmotions.indexOf(target);
        if (currentIndex < 0) {
            return;
        }

        const nextIndex = (currentIndex + direction + allEmotions.length) % allEmotions.length;
        const nextEmotion = allEmotions[nextIndex];
        setImageDialog({ open: true, target: nextEmotion });
        setEmotionPromptDraft(getEmotionPrompt(nextEmotion));
        setIsImageDropActive(false);
    };

    const handleFillMissingEmotionImages = async () => {
        if (!selectedOutfit || !selectedOutfitId) {
            stage().showPriorityMessage('Select an outfit before filling missing emotion images.');
            return;
        }

        if (isFillingMissingEmotions) {
            return;
        }

        const missingEmotions = allEmotions.filter((emotion) => !selectedOutfit.emotionPack?.[emotion]);
        if (missingEmotions.length === 0) {
            stage().showPriorityMessage(`All emotion images already exist for ${selectedOutfit.name}.`);
            return;
        }

        setIsFillingMissingEmotions(true);
        let generatedCount = 0;
        let failedCount = 0;

        try {
            for (const emotion of missingEmotions) {
                setRegeneratingImages((prev) => new Set(prev).add(emotion));

                try {
                    const existingPrompt = selectedOutfit.prompts?.[emotion] || '';
                    if (!existingPrompt.trim()) {
                        const generatedPrompt = await generateOutfitEmotionPrompt(actor, emotion, stage(), selectedOutfitId);
                        if (!generatedPrompt) {
                            throw new Error(`Missing prompt for ${emotion}`);
                        }
                    }

                    await generateEmotionImage(actor, emotion, stage(), true, selectedOutfitId);
                    generatedCount += 1;
                    syncEditedOutfitsFromActor();
                    forceUpdate({});
                } catch (error) {
                    failedCount += 1;
                    console.error(`Failed to fill ${emotion} emotion image:`, error);
                } finally {
                    setRegeneratingImages((prev) => {
                        const next = new Set(prev);
                        next.delete(emotion);
                        return next;
                    });
                }
            }
        } finally {
            setIsFillingMissingEmotions(false);
        }

        if (generatedCount > 0 && failedCount === 0) {
            stage().showPriorityMessage(`Generated ${generatedCount} missing emotion image${generatedCount === 1 ? '' : 's'} for ${selectedOutfit.name}.`);
        } else if (generatedCount > 0 && failedCount > 0) {
            stage().showPriorityMessage(`Generated ${generatedCount} emotion image${generatedCount === 1 ? '' : 's'}; ${failedCount} failed. Check console for details.`);
        } else {
            stage().showPriorityMessage('Failed to generate missing emotion images. Check console for details.');
        }
    };

    const currentImageUrl = imageDialog.target ? getSelectedOutfitImageUrl(imageDialog.target as Emotion | 'base') : '';
    const isCurrentImageRegenerating = imageDialog.target ? regeneratingImages.has(imageDialog.target) : false;
    const imageTargetLabel = imageDialog.target || '';
    const imageTargetOutfitName = selectedOutfit?.name || 'Outfit';
    const isDialogEmotionTarget = !!imageDialog.target && imageDialog.target !== 'base';
    const dialogEmotionIndex = isDialogEmotionTarget ? allEmotions.indexOf(imageDialog.target as Emotion) : -1;
    const baseRegenOutfitOptions = editedOutfits.filter((outfit) => !!outfit.emotionPack?.base);
    const baseRegenOptions: Array<{ value: BaseRegenSource; label: string }> = [
        ...(actor.sampleImageUrl ? [{ value: 'original sample' as BaseRegenSource, label: 'Original Sample Image' }] : []),
        { value: 'description' as BaseRegenSource, label: 'Description Only' },
        ...baseRegenOutfitOptions.map((outfit) => ({
            value: `outfit:${outfit.id}` as BaseRegenSource,
            label: `Outfit: ${outfit.name}`,
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
                    padding: '10px 20px 30px',
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
                                            Affinity (0-10)
                                        </label>
                                        <TextInput
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={1}
                                            fullWidth
                                            value={editedActor.affinity}
                                            onChange={(e) => handleInputChange('affinity', e.target.value)}
                                            placeholder="0"
                                        />
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
                                            State
                                        </label>
                                        <select
                                            value={editedActor.state}
                                            onChange={(e) => handleInputChange('state', e.target.value as ActorState)}
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
                                            {Object.values(ActorState).map((state) => (
                                                <option key={state} value={state}>
                                                    {state}
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
                                            Physical Description
                                        </label>
                                        <textarea
                                            value={editedActor.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Core physical appearance, separate from clothing or outfit details"
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

                            {/* Outfit Section */}
                            <section>
                                <h2 style={{
                                    color: '#00ff88',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Outfit
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
                                                Selected Outfit
                                            </label>
                                            <select
                                                value={selectedOutfit?.id || ''}
                                                onChange={(e) => handleSelectOutfit(e.target.value)}
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
                                                {editedOutfits.map((outfit) => (
                                                    <option key={outfit.id} value={outfit.id}>
                                                        {outfit.name}
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
                                                Outfit Name
                                            </label>
                                            <TextInput
                                                fullWidth
                                                value={selectedOutfit?.name || ''}
                                                onChange={(e) => handleOutfitChange('name', e.target.value)}
                                                placeholder="Outfit name"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Button onClick={handleCreateOutfit}>
                                            New Outfit
                                        </Button>
                                        <Button
                                            onClick={handleDeleteOutfit}
                                            variant="secondary"
                                            disabled={editedOutfits.length <= 1 || selectedOutfit?.id === actor.outfitId}
                                        >
                                            Delete Outfit
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
                                            Outfit Description
                                        </label>
                                        <textarea
                                            value={selectedOutfit?.description || ''}
                                            onChange={(e) => handleOutfitChange('description', e.target.value)}
                                            placeholder="Physical appearance, attire, and distinguishing features for this outfit"
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

                                    {stage().betaMode && (
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
                                                Outfit Object (for testing and export)
                                            </label>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                <Button onClick={handleGenerateOutfitsExport} variant="secondary">
                                                    Generate Object
                                                </Button>
                                            </div>
                                            <textarea
                                                value={outfitsObjectExport}
                                                readOnly
                                                placeholder="Generate object output to export this actor's outfits"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '160px',
                                                    padding: '12px',
                                                    fontSize: '13px',
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    color: '#e0f0ff',
                                                    fontFamily: 'monospace',
                                                    resize: 'vertical',
                                                }}
                                            />
                                        </div>
                                    )}
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
                                    Emotion Images ({selectedOutfit?.name || 'Outfit'})
                                </h2>

                                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                                    <Button
                                        onClick={handleFillMissingEmotionImages}
                                        disabled={!selectedOutfit || isFillingMissingEmotions || missingEmotionCount === 0}
                                    >
                                        {isFillingMissingEmotions
                                            ? 'Filling Missing Emotions...'
                                            : `Fill Missing Emotions (${missingEmotionCount})`}
                                    </Button>
                                </div>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                    gap: '15px' 
                                }}>
                                    {/* original sample */}
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
                                                backgroundColor: getSelectedOutfitImageUrl('base') ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                                border: `2px solid ${getSelectedOutfitImageUrl('base') ? 'rgba(255, 136, 0, 0.5)' : 'rgba(0, 255, 136, 0.2)'}`,
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {getSelectedOutfitImageUrl('base') && (
                                                <img
                                                    src={getSelectedOutfitImageUrl('base')}
                                                    alt={`${selectedOutfit?.name || 'Outfit'} base`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        objectPosition: 'center top',
                                                        display: 'block',
                                                    }}
                                                />
                                            )}
                                            {!getSelectedOutfitImageUrl('base') && (
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
                                        const imageUrl = getSelectedOutfitImageUrl(emotion);
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
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {hasImage && (
                                                        <img
                                                            src={imageUrl}
                                                            alt={`${selectedOutfit?.name || 'Outfit'} ${emotion}`}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                objectPosition: 'center top',
                                                                display: 'block',
                                                            }}
                                                        />
                                                    )}
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
                    Manage {imageTargetLabel} Image - {imageTargetOutfitName}
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
                                {isDialogEmotionTarget && allEmotions.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cycleDialogEmotion(-1);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                left: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '999px',
                                                border: '1px solid rgba(0, 255, 136, 0.45)',
                                                backgroundColor: 'rgba(0, 10, 20, 0.78)',
                                                color: '#00ff88',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                zIndex: 3,
                                            }}
                                            aria-label="Previous emotion image"
                                        >
                                            <ArrowBackIosNew style={{ fontSize: '16px' }} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cycleDialogEmotion(1);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '999px',
                                                border: '1px solid rgba(0, 255, 136, 0.45)',
                                                backgroundColor: 'rgba(0, 10, 20, 0.78)',
                                                color: '#00ff88',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                zIndex: 3,
                                            }}
                                            aria-label="Next emotion image"
                                        >
                                            <ArrowForwardIos style={{ fontSize: '16px' }} />
                                        </button>
                                    </>
                                )}

                                {isDialogEmotionTarget && dialogEmotionIndex >= 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        padding: '4px 10px',
                                        borderRadius: '999px',
                                        border: '1px solid rgba(0, 255, 136, 0.35)',
                                        backgroundColor: 'rgba(0, 10, 20, 0.78)',
                                        color: '#00ff88',
                                        fontSize: '12px',
                                        letterSpacing: '0.4px',
                                        zIndex: 3,
                                    }}>
                                        {dialogEmotionIndex + 1} / {allEmotions.length}
                                    </div>
                                )}

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
                                Click the image area to select a file, or drag and drop an image to replace the current {String(imageTargetLabel).toLowerCase()} image for {imageTargetOutfitName}.
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
                                            boxSizing: 'border-box',
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
                                        onChange={(e) => handleEmotionPromptDraftChange(e.target.value)}
                                        placeholder="Describe the character's expression, gesture, or pose for this emotion; leave blank to have a prompt generated for you."
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
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
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', alignSelf: 'flex-start' }}>
                                <Button
                                    onClick={async () => {
                                        const target = imageDialog.target;
                                        if (!target) return;
                                        if (target === 'base') {
                                            handleRegenerateBase(baseRegenSource);
                                        } else {
                                            handleRegenerateEmotion(target, emotionPromptDraft);
                                        }
                                    }}
                                    disabled={!imageDialog.target || isCurrentImageRegenerating}
                                >
                                    {isCurrentImageRegenerating ? 'Generating...' : 'Regenerate Image'}
                                </Button>
                                {imageDialog.target && imageDialog.target !== 'base' && (
                                    <Button
                                        onClick={() => handleDeleteEmotionImage(imageDialog.target as Emotion)}
                                        disabled={!currentImageUrl || isCurrentImageRegenerating || isUploadingImage}
                                        variant="secondary"
                                    >
                                        Delete Image
                                    </Button>
                                )}
                            </div>
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
