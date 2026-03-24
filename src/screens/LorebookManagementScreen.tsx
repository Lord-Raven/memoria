import React, { FC, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Close } from '@mui/icons-material';
import { Stage } from '../Stage';
import { Lore } from '../content/Lore';
import { Button, GlassPanel, TextInput, Title } from './UiComponents';

interface LorebookManagementScreenProps {
    stage: () => Stage;
    onClose: () => void;
}

type LoreCategory = Lore['type'];

const CATEGORY_ORDER: LoreCategory[] = ['character', 'location', 'other'];

const CATEGORY_LABELS: Record<LoreCategory, string> = {
    character: 'Character',
    location: 'Location',
    other: 'Other',
};

const sortLoreEntries = (entries: Lore[]) => {
    return [...entries].sort((a, b) => {
        if (a.insertionOrder !== b.insertionOrder) {
            return a.insertionOrder - b.insertionOrder;
        }
        return a.title.localeCompare(b.title);
    });
};

const parseTriggers = (value: string) => {
    return value
        .split(/\r?\n|,/)
        .map((trigger) => trigger.trim())
        .filter((trigger) => trigger.length > 0);
};

const asNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const LorebookManagementScreen: FC<LorebookManagementScreenProps> = ({ stage, onClose }) => {
    const [loreEntries, setLoreEntries] = useState<Lore[]>(() => sortLoreEntries(stage().getSave().lorebook || []));
    const [selectedLoreId, setSelectedLoreId] = useState<string | null>(() => {
        const initialEntries = sortLoreEntries(stage().getSave().lorebook || []);
        return initialEntries[0]?.id || null;
    });

    const groupedEntries = useMemo(() => {
        const groups: Record<LoreCategory, Lore[]> = {
            character: [],
            location: [],
            other: [],
        };

        for (const entry of loreEntries) {
            const category: LoreCategory = entry.type || 'other';
            groups[category].push(entry);
        }

        for (const category of CATEGORY_ORDER) {
            groups[category] = sortLoreEntries(groups[category]);
        }

        return groups;
    }, [loreEntries]);

    const selectedLore = useMemo(() => loreEntries.find((entry) => entry.id === selectedLoreId) || null, [loreEntries, selectedLoreId]);

    const applyLorebookChange = (updater: (entries: Lore[]) => Lore[]) => {
        setLoreEntries((currentEntries) => {
            const nextEntries = sortLoreEntries(updater(currentEntries));
            const save = stage().getSave();
            save.lorebook = nextEntries;
            stage().saveGame();
            return nextEntries;
        });
    };

    const updateSelectedLore = (patch: Partial<Lore>) => {
        if (!selectedLoreId) {
            return;
        }

        applyLorebookChange((entries) => entries.map((entry) => (
            entry.id === selectedLoreId ? { ...entry, ...patch } : entry
        )));
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
                    padding: '20px',
                }}
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        onClose();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onClick={(event) => event.stopPropagation()}
                    style={{
                        width: '90vw',
                        maxWidth: '1500px',
                        maxHeight: '90vh',
                    }}
                >
                    <GlassPanel
                        variant="bright"
                        style={{
                            height: '90vh',
                            overflow: 'hidden',
                            position: 'relative',
                            padding: '30px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                            }}
                        >
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                Lorebook Management
                            </Title>
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

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(280px, 360px) 1fr',
                                gap: '20px',
                                flex: 1,
                                minHeight: 0,
                            }}
                        >
                            <div
                                style={{
                                    background: 'rgba(0, 20, 40, 0.45)',
                                    border: '1px solid rgba(0, 255, 136, 0.25)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    overflowY: 'auto',
                                }}
                            >
                                {loreEntries.length === 0 ? (
                                    <div
                                        style={{
                                            color: 'rgba(224, 240, 255, 0.7)',
                                            fontSize: '14px',
                                            textAlign: 'center',
                                            padding: '20px',
                                        }}
                                    >
                                        No lore entries found in this save.
                                    </div>
                                ) : (
                                    CATEGORY_ORDER.map((category) => {
                                        const categoryEntries = groupedEntries[category];
                                        if (categoryEntries.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <div key={category} style={{ marginBottom: '16px' }}>
                                                <div
                                                    style={{
                                                        color: 'rgba(0, 255, 136, 0.9)',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        letterSpacing: '0.08em',
                                                        textTransform: 'uppercase',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    {CATEGORY_LABELS[category]} ({categoryEntries.length})
                                                </div>
                                                <div style={{ display: 'grid', gap: '8px' }}>
                                                    {categoryEntries.map((entry) => {
                                                        const isSelected = selectedLoreId === entry.id;
                                                        return (
                                                            <motion.button
                                                                key={entry.id}
                                                                whileHover={{ scale: 1.01 }}
                                                                whileTap={{ scale: 0.99 }}
                                                                onClick={() => setSelectedLoreId(entry.id)}
                                                                style={{
                                                                    textAlign: 'left',
                                                                    background: isSelected ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 30, 60, 0.5)',
                                                                    border: `1px solid ${isSelected ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 255, 136, 0.22)'}`,
                                                                    borderRadius: '8px',
                                                                    padding: '10px',
                                                                    cursor: 'pointer',
                                                                    color: '#e0f0ff',
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{entry.title || '(Untitled)'}</div>
                                                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                                                    order {entry.insertionOrder} · {entry.enabled ? 'enabled' : 'disabled'}
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div
                                style={{
                                    background: 'rgba(0, 20, 40, 0.45)',
                                    border: '1px solid rgba(0, 255, 136, 0.25)',
                                    borderRadius: '12px',
                                    padding: '18px',
                                    overflowY: 'auto',
                                }}
                            >
                                {!selectedLore ? (
                                    <div
                                        style={{
                                            color: 'rgba(224, 240, 255, 0.7)',
                                            fontSize: '15px',
                                            textAlign: 'center',
                                            padding: '30px',
                                        }}
                                    >
                                        Select a lore entry to view and edit details.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '14px' }}>
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px' }}>ID</label>
                                            <TextInput value={selectedLore.id} fullWidth style={{ opacity: 0.7 }} />
                                        </div>

                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Title</label>
                                            <TextInput
                                                value={selectedLore.title}
                                                onChange={(event) => updateSelectedLore({ title: event.target.value })}
                                                fullWidth
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Category</label>
                                            <select
                                                value={selectedLore.type}
                                                onChange={(event) => updateSelectedLore({ type: event.target.value as LoreCategory })}
                                                className="input-base"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="character">Character</option>
                                                <option value="location">Location</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                                gap: '10px',
                                            }}
                                        >
                                            <div style={{ display: 'grid', gap: '6px' }}>
                                                <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Order</label>
                                                <TextInput
                                                    value={String(selectedLore.insertionOrder)}
                                                    onChange={(event) => updateSelectedLore({ insertionOrder: asNumber(event.target.value, selectedLore.insertionOrder) })}
                                                    fullWidth
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gap: '6px' }}>
                                                <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Priority</label>
                                                <TextInput
                                                    value={String(selectedLore.priority)}
                                                    onChange={(event) => updateSelectedLore({ priority: asNumber(event.target.value, selectedLore.priority) })}
                                                    fullWidth
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gap: '6px' }}>
                                                <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Probability</label>
                                                <TextInput
                                                    value={String(selectedLore.probability)}
                                                    onChange={(event) => updateSelectedLore({ probability: asNumber(event.target.value, selectedLore.probability) })}
                                                    fullWidth
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gap: '6px' }}>
                                                <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Scan Depth</label>
                                                <TextInput
                                                    value={String(selectedLore.scanDepth)}
                                                    onChange={(event) => updateSelectedLore({ scanDepth: asNumber(event.target.value, selectedLore.scanDepth) })}
                                                    fullWidth
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLore.enabled}
                                                    onChange={(event) => updateSelectedLore({ enabled: event.target.checked })}
                                                />
                                                Enabled
                                            </label>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLore.constant}
                                                    onChange={(event) => updateSelectedLore({ constant: event.target.checked })}
                                                />
                                                Constant
                                            </label>
                                        </div>

                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Triggers (comma or newline separated)</label>
                                            <textarea
                                                value={selectedLore.triggers.join('\n')}
                                                onChange={(event) => updateSelectedLore({ triggers: parseTriggers(event.target.value) })}
                                                className="input-base"
                                                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            <label style={{ color: '#cfe6ff', fontSize: '13px' }}>Content</label>
                                            <textarea
                                                value={selectedLore.content}
                                                onChange={(event) => updateSelectedLore({ content: event.target.value })}
                                                className="input-base"
                                                style={{ width: '100%', minHeight: '280px', resize: 'vertical' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button variant="secondary" onClick={onClose}>Close</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
