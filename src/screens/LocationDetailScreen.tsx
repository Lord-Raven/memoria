import { FC, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import { getLocationDescription, Location, updateLocationDescription } from '../content/Location';
import { Close, Save, Image as ImageIcon, Place } from '@mui/icons-material';
import { Button, GlassPanel, TextInput, Title } from './UiComponents';

interface LocationDetailScreenProps {
    location: Location;
    stage: () => Stage;
    onClose: () => void;
}

export const LocationDetailScreen: FC<LocationDetailScreenProps> = ({ location, stage, onClose }) => {
    const [editedLocation, setEditedLocation] = useState<{
        name: string;
        description: string;
        themeColor: string;
        lightColor: string;
        weight: number;
        imageUrl: string;
        centerX: number;
        centerY: number;
        focalX: number;
        focalY: number;
        discovered: boolean;
    }>({
        name: location.name,
        description: getLocationDescription(location.id, stage()),
        themeColor: location.themeColor,
        lightColor: location.lightColor,
        weight: location.weight,
        imageUrl: location.imageUrl,
        centerX: location.center?.x ?? 0.5,
        centerY: location.center?.y ?? 0.5,
        focalX: location.focalPoint?.x ?? 0.5,
        focalY: location.focalPoint?.y ?? 0.5,
        discovered: location.discovered,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const imageUploadInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setEditedLocation(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);

        location.name = editedLocation.name;
        updateLocationDescription(location.id, editedLocation.description, stage());
        location.themeColor = editedLocation.themeColor;
        location.lightColor = editedLocation.lightColor;
        location.weight = editedLocation.weight;
        location.imageUrl = editedLocation.imageUrl;
        location.center = { x: editedLocation.centerX, y: editedLocation.centerY };
        location.focalPoint = { x: editedLocation.focalX, y: editedLocation.focalY };
        location.discovered = editedLocation.discovered;

        stage().saveGame();

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            stage().showPriorityMessage('Please select a valid image file.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const uploadedUrl = await stage().uploadFile(`location-${location.id}.png`, file);
            handleInputChange('imageUrl', uploadedUrl);
            location.imageUrl = uploadedUrl;
            stage().saveGame();
        } catch (error) {
            console.error('Failed to upload location image:', error);
            stage().showPriorityMessage('Failed to upload location image. Check console for details.');
        } finally {
            setIsUploadingImage(false);
            if (imageUploadInputRef.current) {
                imageUploadInputRef.current.value = '';
            }
        }
    };

    const clampedCoord = (value: string): number => {
        const n = parseFloat(value);
        if (isNaN(n)) return 0;
        return Math.min(1, Math.max(0, n));
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: '#00ff88',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '8px',
    };

    const sectionHeadingStyle: React.CSSProperties = {
        color: '#00ff88',
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '15px',
        borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
        paddingBottom: '5px',
    };

    const textareaStyle: React.CSSProperties = {
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
    };

    const numberInputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 20, 40, 0.6)',
        border: '2px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '5px',
        color: '#e0f0ff',
        fontFamily: 'inherit',
    };

    const sliderRowStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: '12px',
    };

    const sliderStyle: React.CSSProperties = {
        width: '100%',
        accentColor: '#00ff88',
        cursor: 'pointer',
    };

    const sliderValueStyle: React.CSSProperties = {
        minWidth: '56px',
        textAlign: 'right',
        color: '#e0f0ff',
        fontSize: '13px',
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.9,
    };

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
                    const selection = window.getSelection();
                    const hasSelection = selection && selection.toString().length > 0;
                    if (e.target === e.currentTarget && !hasSelection) {
                        onClose();
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
                        {/* Header */}
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
                                Location Details: {editedLocation.name}
                            </Title>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Save style={{ fontSize: '20px' }} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(0, 255, 136, 0.7)',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Close />
                                </motion.button>
                            </div>
                        </div>

                        {/* Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                            {/* Basic Information */}
                            <section>
                                <h2 style={sectionHeadingStyle}>Basic Information</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={labelStyle}>Name</label>
                                        <TextInput
                                            fullWidth
                                            value={editedLocation.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Location name"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Description</label>
                                        <textarea
                                            value={editedLocation.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="A description of this location"
                                            style={textareaStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            id={`discovered-${location.id}`}
                                            type="checkbox"
                                            checked={editedLocation.discovered}
                                            onChange={(e) => handleInputChange('discovered', e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00ff88' }}
                                        />
                                        <label
                                            htmlFor={`discovered-${location.id}`}
                                            style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}
                                        >
                                            Discovered (visible on map)
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* Visual Theme */}
                            <section>
                                <h2 style={sectionHeadingStyle}>Visual Theme</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={labelStyle}>Theme Color</label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TextInput
                                                value={editedLocation.themeColor}
                                                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                                                placeholder="#RRGGBB"
                                                style={{ flex: 1 }}
                                            />
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '38px',
                                                    backgroundColor: editedLocation.themeColor,
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Light Color</label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TextInput
                                                value={editedLocation.lightColor}
                                                onChange={(e) => handleInputChange('lightColor', e.target.value)}
                                                placeholder="#RRGGBB"
                                                style={{ flex: 1 }}
                                            />
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '38px',
                                                    backgroundColor: editedLocation.lightColor,
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Map Settings */}
                            <section>
                                <h2 style={sectionHeadingStyle}>Map Settings</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={labelStyle}>
                                            Weight
                                            <span style={{ fontWeight: 'normal', opacity: 0.7, marginLeft: '8px' }}>
                                                (base cell radius in map-vmin units)
                                            </span>
                                        </label>
                                        <div style={sliderRowStyle}>
                                            <input
                                                type="range"
                                                value={editedLocation.weight}
                                                min={1}
                                                max={100}
                                                step={1}
                                                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 1)}
                                                style={sliderStyle}
                                            />
                                            <span style={sliderValueStyle}>{Math.round(editedLocation.weight)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Center X <span style={{ fontWeight: 'normal', opacity: 0.7 }}>(0–1)</span></label>
                                        <div style={sliderRowStyle}>
                                            <input
                                                type="range"
                                                value={editedLocation.centerX}
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onChange={(e) => handleInputChange('centerX', clampedCoord(e.target.value))}
                                                style={sliderStyle}
                                            />
                                            <span style={sliderValueStyle}>{editedLocation.centerX.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Center Y <span style={{ fontWeight: 'normal', opacity: 0.7 }}>(0–1)</span></label>
                                        <div style={sliderRowStyle}>
                                            <input
                                                type="range"
                                                value={editedLocation.centerY}
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onChange={(e) => handleInputChange('centerY', clampedCoord(e.target.value))}
                                                style={sliderStyle}
                                            />
                                            <span style={sliderValueStyle}>{editedLocation.centerY.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Focal Point X <span style={{ fontWeight: 'normal', opacity: 0.7 }}>(0–1)</span></label>
                                        <div style={sliderRowStyle}>
                                            <input
                                                type="range"
                                                value={editedLocation.focalX}
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onChange={(e) => handleInputChange('focalX', clampedCoord(e.target.value))}
                                                style={sliderStyle}
                                            />
                                            <span style={sliderValueStyle}>{editedLocation.focalX.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Focal Point Y <span style={{ fontWeight: 'normal', opacity: 0.7 }}>(0–1)</span></label>
                                        <div style={sliderRowStyle}>
                                            <input
                                                type="range"
                                                value={editedLocation.focalY}
                                                min={0}
                                                max={1}
                                                step={0.01}
                                                onChange={(e) => handleInputChange('focalY', clampedCoord(e.target.value))}
                                                style={sliderStyle}
                                            />
                                            <span style={sliderValueStyle}>{editedLocation.focalY.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Location Image */}
                            <section>
                                <h2 style={{ ...sectionHeadingStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ImageIcon />
                                    Location Image
                                </h2>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    {/* Preview */}
                                    <div
                                        style={{
                                            width: '160px',
                                            height: '120px',
                                            borderRadius: '8px',
                                            border: `3px solid ${editedLocation.themeColor || 'rgba(0, 255, 136, 0.3)'}`,
                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                            backgroundImage: editedLocation.imageUrl ? `url(${editedLocation.imageUrl})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: `${editedLocation.focalX * 100}% ${editedLocation.focalY * 100}%`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {!editedLocation.imageUrl && (
                                            <Place style={{ fontSize: '48px', color: 'rgba(0, 255, 136, 0.3)' }} />
                                        )}
                                    </div>

                                    {/* URL + Upload */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
                                        <div>
                                            <label style={labelStyle}>Image URL</label>
                                            <TextInput
                                                fullWidth
                                                value={editedLocation.imageUrl}
                                                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                                                placeholder="https://... or leave empty"
                                            />
                                        </div>
                                        <div>
                                            <Button
                                                onClick={() => imageUploadInputRef.current?.click()}
                                                disabled={isUploadingImage}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <ImageIcon style={{ fontSize: '18px' }} />
                                                {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                                            </Button>
                                            <input
                                                ref={imageUploadInputRef}
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleImageFileChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
