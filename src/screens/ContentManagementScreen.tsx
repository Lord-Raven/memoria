import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import { Actor, getEmotionImage } from '../content/Actor';
import { Location } from '../content/Location';
import { Close, Person, Groups, Place } from '@mui/icons-material';
import { Button, GlassPanel, Title } from './UiComponents';
import { ActorDetailScreen } from './ActorDetailScreen';
import { LocationDetailScreen } from './LocationDetailScreen';

interface ContentManagementScreenProps {
    stage: () => Stage;
    onClose: () => void;
}

type TabType = 'actors' | 'locations';

export const ContentManagementScreen: FC<ContentManagementScreenProps> = ({ stage, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('actors');
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // Get all actors from the save
    const actors = Object.values(stage().getSave().actors);

    // Get all locations from the save atlas
    const locations = Object.values(stage().getSave().atlas || {});
    const ardeiaLocations = locations.filter(location =>
        location.id.startsWith('ardeia-') || location.imageUrl?.toLowerCase().includes('/ardeia/')
    );
    const outsideLocations = locations.filter(location => !ardeiaLocations.includes(location));

    const handleActorClick = (actor: Actor) => {
        setSelectedActor(actor);
    };

    const handleCloseDetail = () => {
        setSelectedActor(null);
        stage().saveGame();
    };

    const handleLocationClick = (location: Location) => {
        setSelectedLocation(location);
    };

    const handleCloseLocationDetail = () => {
        setSelectedLocation(null);
        stage().saveGame();
    };

    return (
        <>
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
                        if (e.target === e.currentTarget) {
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
                                overflow: 'hidden',
                                position: 'relative',
                                padding: '30px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header with close button */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                            }}>
                                <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                    Content Management
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
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Close />
                                </motion.button>
                            </div>

                            {/* Tab Navigation */}
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                marginBottom: '20px',
                                borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                paddingBottom: '10px',
                            }}>
                                <Button
                                    onClick={() => setActiveTab('actors')}
                                    variant={activeTab === 'actors' ? 'primary' : 'secondary'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: activeTab === 'actors' ? 1 : 0.6,
                                    }}
                                >
                                    <Person />
                                    Actors ({actors.length})
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('locations')}
                                    variant={activeTab === 'locations' ? 'primary' : 'secondary'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: activeTab === 'locations' ? 1 : 0.6,
                                    }}
                                >
                                    <Place />
                                    Locations ({locations.length})
                                </Button>
                            </div>

                            {/* Content Area */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                paddingRight: '10px',
                            }}>
                                {/* Actors Tab */}
                                {activeTab === 'actors' && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '15px',
                                        padding: '10px',
                                    }}>
                                        {actors.length === 0 ? (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: 'rgba(224, 240, 255, 0.6)',
                                                fontSize: '16px',
                                            }}>
                                                No actors found in the current save.
                                            </div>
                                        ) : (
                                            actors.map(actor => (
                                                <motion.div
                                                    key={actor.id}
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleActorClick(actor)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                        border: '2px solid rgba(0, 255, 136, 0.3)',
                                                        borderRadius: '8px',
                                                        padding: '15px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        transition: 'border-color 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                    }}
                                                >
                                                    {/* Actor Avatar */}
                                                    <div
                                                        style={{
                                                            width: '120px',
                                                            height: '120px',
                                                            borderRadius: '50%',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                            border: `3px solid ${actor.themeColor}`,
                                                            backgroundImage: getEmotionImage(actor, 'neutral') || getEmotionImage(actor, 'base') || actor.sampleImageUrl 
                                                                ? `url(${getEmotionImage(actor, 'neutral') || getEmotionImage(actor, 'base') || actor.sampleImageUrl})` 
                                                                : 'none',
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'top center',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        {!getEmotionImage(actor, 'neutral') && !getEmotionImage(actor, 'base') && !actor.sampleImageUrl && (
                                                            <Person style={{ fontSize: '50px', color: 'rgba(0, 255, 136, 0.3)' }} />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Actor Name */}
                                                    <div
                                                        style={{
                                                            color: '#00ff88',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            textAlign: 'center',
                                                            fontFamily: actor.themeFontFamily,
                                                        }}
                                                    >
                                                        {actor.name}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Locations Tab */}
                                {activeTab === 'locations' && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '25px',
                                        padding: '10px',
                                    }}>
                                        {locations.length === 0 ? (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: 'rgba(224, 240, 255, 0.6)',
                                                fontSize: '16px',
                                            }}>
                                                No locations found in the current save.
                                            </div>
                                        ) : (
                                            <>
                                                {[
                                                    { title: 'Ardeia', entries: ardeiaLocations },
                                                    { title: 'Outside', entries: outsideLocations },
                                                ].map(section => (
                                                    <div key={section.title}>
                                                        <div style={{
                                                            color: 'rgba(224, 240, 255, 0.9)',
                                                            fontSize: '18px',
                                                            fontWeight: 'bold',
                                                            marginBottom: '12px',
                                                            borderBottom: '1px solid rgba(0, 255, 136, 0.25)',
                                                            paddingBottom: '6px',
                                                        }}>
                                                            {section.title}
                                                        </div>
                                                        {section.entries.length === 0 ? (
                                                            <div style={{
                                                                color: 'rgba(224, 240, 255, 0.6)',
                                                                fontSize: '14px',
                                                                fontStyle: 'italic',
                                                            }}>
                                                                No locations.
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                                gap: '15px',
                                                            }}>
                                                                {section.entries.map(location => (
                                                                    <motion.div
                                                                        key={location.id}
                                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => handleLocationClick(location)}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                                            border: `2px solid ${location.themeColor || 'rgba(0, 255, 136, 0.3)'}`,
                                                                            borderRadius: '8px',
                                                                            padding: '15px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            opacity: location.discovered ? 1 : 0.55,
                                                                        }}
                                                                    >
                                                                        {/* Location Thumbnail */}
                                                                        <div
                                                                            style={{
                                                                                width: '120px',
                                                                                height: '80px',
                                                                                borderRadius: '6px',
                                                                                backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                                                border: `2px solid ${location.themeColor || 'rgba(0, 255, 136, 0.3)'}`,
                                                                                backgroundImage: location.imageUrl ? `url(${location.imageUrl})` : 'none',
                                                                                backgroundSize: 'cover',
                                                                                backgroundPosition: `${(location.focalPoint?.x ?? 0.5) * 100}% ${(location.focalPoint?.y ?? 0.5) * 100}%`,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                overflow: 'hidden',
                                                                            }}
                                                                        >
                                                                            {!location.imageUrl && (
                                                                                <Place style={{ fontSize: '36px', color: 'rgba(0, 255, 136, 0.3)' }} />
                                                                            )}
                                                                        </div>

                                                                        {/* Location Name */}
                                                                        <div
                                                                            style={{
                                                                                color: location.themeColor || '#00ff88',
                                                                                fontSize: '14px',
                                                                                fontWeight: 'bold',
                                                                                textAlign: 'center',
                                                                            }}
                                                                        >
                                                                            {location.name}
                                                                        </div>

                                                                        {/* Undiscovered badge */}
                                                                        {!location.discovered && (
                                                                            <div style={{
                                                                                fontSize: '11px',
                                                                                color: 'rgba(224, 240, 255, 0.5)',
                                                                            }}>
                                                                                Undiscovered
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </GlassPanel>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Actor Detail Modal */}
            {selectedActor && (
                <ActorDetailScreen
                    actor={selectedActor}
                    stage={stage}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Location Detail Modal */}
            {selectedLocation && (
                <LocationDetailScreen
                    location={selectedLocation}
                    stage={stage}
                    onClose={handleCloseLocationDetail}
                />
            )}
        </>
    );
};
