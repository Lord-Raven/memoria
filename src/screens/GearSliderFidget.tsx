import { FC, CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import gearSvgRaw from '../assets/gear.svg?raw';
import slideGearSvgRaw from '../assets/slide-gear.svg?raw';

const gearSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gearSvgRaw)}`;
const slideGearSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(slideGearSvgRaw)}`;

interface GearSliderFidgetProps {
    className?: string;
    style?: CSSProperties;
    toothCount?: number;
    loadingPercentage?: number;
    gearSize?: number;
    rackWidth?: number;
    rackHeight?: number;
    rackViewportWidth?: number;
    disabled?: boolean;
    onStep?: (direction: 1 | -1) => void;
}

export const GearSliderFidget: FC<GearSliderFidgetProps> = ({
    className,
    style,
    toothCount = 12,
    loadingPercentage = 0,
    gearSize = 184,
    rackWidth = 520,
    rackHeight = 34,
    rackViewportWidth = 260,
    disabled = false,
    onStep,
}) => {
    const gearControls = useAnimationControls();
    const cogControls = useAnimationControls();
    const rackControls = useAnimationControls();
    const gearIdleControls = useAnimationControls();
    const rackIdleControls = useAnimationControls();

    const centeredRackX = useMemo(() => -(rackWidth - rackViewportWidth) / 2, [rackWidth, rackViewportWidth]);
    const minToothIndex = 0;
    const maxToothIndex = toothCount - 1;
    const centerToothIndex = useMemo(() => Math.floor((toothCount - 1) / 2), [toothCount]);
    const toothAngle = 360 / toothCount;
    const toothStep = rackWidth / toothCount;
    const idleRotation = useMemo(() => toothAngle * 0.18, [toothAngle]);
    const idleRackTravel = useMemo(() => toothStep * 0.14, [toothStep]);
    const thresholdIndex = useMemo(
        () => Math.max(minToothIndex, Math.min(maxToothIndex, Math.floor(loadingPercentage / 10))),
        [loadingPercentage, minToothIndex, maxToothIndex],
    );

    const targetRotation = thresholdIndex * toothAngle;
    const targetRackX = centeredRackX + (toothStep * centerToothIndex) - (thresholdIndex * toothStep); // Center, then shift to the starting tooth, then apply offset for current tooth.

    const [rotation, setRotation] = useState(() => targetRotation);
    const [rackX, setRackX] = useState(() => targetRackX);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isTampered, setIsTampered] = useState(false);

    const rotationRef = useRef(rotation);
    const rackXRef = useRef(rackX);
    const isAnimatingRef = useRef(isAnimating);

    useEffect(() => {
        rotationRef.current = rotation;
    }, [rotation]);

    useEffect(() => {
        rackXRef.current = rackX;
    }, [rackX]);

    useEffect(() => {
        isAnimatingRef.current = isAnimating;
    }, [isAnimating]);

    useEffect(() => {
        if (disabled || isAnimating) {
            gearIdleControls.stop();
            rackIdleControls.stop();
            void gearIdleControls.start({
                rotate: 0,
                transition: {
                    duration: 0.2,
                    ease: 'easeOut',
                },
            });
            void rackIdleControls.start({
                x: 0,
                transition: {
                    duration: 0.2,
                    ease: 'easeOut',
                },
            });
            return;
        }

        void gearIdleControls.start({
            rotate: [0, idleRotation, 0, -idleRotation, 0],
            transition: {
                duration: 4.8,
                times: [0, 0.25, 0.5, 0.75, 1],
                ease: 'easeInOut',
                repeat: Infinity,
            },
        });
        void rackIdleControls.start({
            x: [0, -idleRackTravel, 0, idleRackTravel, 0],
            transition: {
                duration: 4.8,
                times: [0, 0.25, 0.5, 0.75, 1],
                ease: 'easeInOut',
                repeat: Infinity,
            },
        });

        return () => {
            gearIdleControls.stop();
            rackIdleControls.stop();
        };
    }, [
        disabled,
        isAnimating,
        idleRotation,
        idleRackTravel,
        gearIdleControls,
        rackIdleControls,
    ]);

    useEffect(() => {
        const syncToThreshold = async () => {
            if (isAnimatingRef.current) {
                return;
            }

            const currentRotation = rotationRef.current;
            const currentRackX = rackXRef.current;

            if (
                Math.abs(currentRotation - targetRotation) < 0.001
                && Math.abs(currentRackX - targetRackX) < 0.001
            ) {
                setIsTampered(false);
                return;
            }

            const direction: 1 | -1 = targetRotation >= currentRotation ? 1 : -1;
            const rotationOvershoot = direction * toothAngle * 0.2;
            const rackOvershoot = -direction * toothStep * 0.2;

            setIsAnimating(true);
            await Promise.all([
                gearControls.start({
                    rotate: [currentRotation, targetRotation + rotationOvershoot, targetRotation],
                    transition: {
                        duration: 0.36,
                        times: [0, 0.74, 1],
                        ease: 'easeOut',
                    },
                }),
                cogControls.start({
                    rotate: [-currentRotation, -(targetRotation + rotationOvershoot), -targetRotation],
                    transition: {
                        duration: 0.36,
                        times: [0, 0.74, 1],
                        ease: 'easeOut',
                    },
                }),
                rackControls.start({
                    x: [currentRackX, targetRackX + rackOvershoot, targetRackX],
                    transition: {
                        duration: 0.4,
                        times: [0, 0.72, 1],
                        ease: 'easeOut',
                    },
                }),
            ]);

            setRotation(targetRotation);
            rotationRef.current = targetRotation;
            setRackX(targetRackX);
            rackXRef.current = targetRackX;
            setIsAnimating(false);
            setIsTampered(false);
        };

        void syncToThreshold();
    }, [
        thresholdIndex,
        targetRotation,
        targetRackX,
        toothAngle,
        toothStep,
        gearControls,
        cogControls,
        rackControls,
    ]);

    const isAlignedToThreshold = (candidateRackX: number) => (
        Math.abs(candidateRackX - targetRackX) < 0.001
    );

    const clampToothIndex = (value: number) => (
        Math.max(minToothIndex, Math.min(maxToothIndex, value))
    );

    const rackXForToothIndex = (toothIndex: number) => (
        centeredRackX + (toothStep * centerToothIndex) - (toothIndex * toothStep)
    );

    const toothIndexForRackX = (candidateRackX: number) => (
        clampToothIndex(
            Math.round((centeredRackX + (toothStep * centerToothIndex) - candidateRackX) / toothStep),
        )
    );

    const handleTurn = async () => {
        if (disabled || isAnimatingRef.current) {
            return;
        }

        const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const currentRotation = rotationRef.current;
        const currentRackX = rackXRef.current;
        const currentToothIndex = toothIndexForRackX(currentRackX);
        const nextToothIndex = clampToothIndex(currentToothIndex + direction);

        if (nextToothIndex === currentToothIndex) {
            return;
        }

        const appliedDirection: 1 | -1 = nextToothIndex > currentToothIndex ? 1 : -1;
        const nextRotation = currentRotation + (appliedDirection * toothAngle);
        const nextRackX = rackXForToothIndex(nextToothIndex);

        const rotationOvershoot = appliedDirection * toothAngle * 0.2;
        const rackOvershoot = -appliedDirection * toothStep * 0.2;

        setIsAnimating(true);
        await Promise.all([
            gearControls.start({
                rotate: [currentRotation, nextRotation + rotationOvershoot, nextRotation],
                transition: {
                    duration: 0.36,
                    times: [0, 0.74, 1],
                    ease: 'easeOut',
                },
            }),
            cogControls.start({
                rotate: [-currentRotation, -(nextRotation + rotationOvershoot), -nextRotation],
                transition: {
                    duration: 0.36,
                    times: [0, 0.74, 1],
                    ease: 'easeOut',
                },
            }),
            rackControls.start({
                x: [currentRackX, nextRackX + rackOvershoot, nextRackX],
                transition: {
                    duration: 0.4,
                    times: [0, 0.72, 1],
                    ease: 'easeOut',
                },
            }),
        ]);

        setRotation(nextRotation);
        rotationRef.current = nextRotation;
        setRackX(nextRackX);
        rackXRef.current = nextRackX;
        setIsAnimating(false);
        setIsTampered(!isAlignedToThreshold(nextRackX));
        onStep?.(appliedDirection);
    };

    return (
        <div
            className={`gear-slider-fidget ${className || ''}`.trim()}
            style={{
                ...style,
                '--gsf-gear-size': `${gearSize}px`,
                '--gsf-rack-height': `${rackHeight}px`,
                '--gsf-rack-window-width': `${rackViewportWidth}px`,
            } as CSSProperties}
        >
            <div className="gear-slider-rack-window" aria-hidden="true">
                <motion.div initial={{ x: 0 }} animate={rackIdleControls}>
                    <motion.div
                        className="gear-slider-rack"
                        style={{
                            width: `${rackWidth}px`,
                            maskImage: `url("${slideGearSvg}")`,
                            WebkitMaskImage: `url("${slideGearSvg}")`,
                        }}
                        initial={{ x: centeredRackX }}
                        animate={rackControls}
                    />
                </motion.div>
            </div>

            <motion.div initial={{ rotate: 0 }} animate={gearIdleControls}>
                <motion.button
                    type="button"
                    className="gear-slider-cog-button"
                    onClick={handleTurn}
                    disabled={disabled || isAnimating}
                    whileHover={!disabled ? { scale: 1.03 } : undefined}
                    whileTap={!disabled ? { scale: 0.96 } : undefined}
                    initial={{ rotate: 0 }}
                    animate={gearControls}
                    aria-label="Turn gear"
                    style={{
                        maskImage: `url("${gearSvg}")`,
                        WebkitMaskImage: `url("${gearSvg}")`,
                    }}
                >
                    <motion.span
                        aria-hidden="true"
                        className="gear-slider-cog"
                        initial={{ rotate: 0 }}
                        animate={cogControls}
                    />
                </motion.button>
            </motion.div>

            <span
                aria-hidden="true"
                className={`gear-slider-loading-icon ${isTampered ? 'is-tampered' : ''}`.trim()}
            >
                <HourglassEmptyRoundedIcon />
            </span>
        </div>
    );
};