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
    pitchRadiusRatio?: number;
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
    pitchRadiusRatio = 0.48,
    disabled = false,
    onStep,
}) => {
    const gearControls = useAnimationControls();
    const cogControls = useAnimationControls();
    const rackControls = useAnimationControls();

    const centeredRackX = useMemo(() => -(rackWidth - rackViewportWidth) / 2, [rackWidth, rackViewportWidth]);

    const [rotation, setRotation] = useState(0);
    const [rackX, setRackX] = useState(centeredRackX);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isTampered, setIsTampered] = useState(false);

    const rotationRef = useRef(rotation);
    const rackXRef = useRef(rackX);
    const isAnimatingRef = useRef(isAnimating);

    const toothAngle = 360 / toothCount;
    const toothStep = rackWidth / toothCount; //(2 * Math.PI * ((gearSize * pitchRadiusRatio) / 2)) / toothCount;
    const thresholdIndex = useMemo(
        () => Math.max(0, Math.min(10, Math.floor(loadingPercentage / 10))),
        [loadingPercentage],
    );

    const targetRotation = thresholdIndex * toothAngle;
    const targetRackX = centeredRackX - (thresholdIndex * toothStep);

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

    const handleTurn = async () => {
        if (disabled || isAnimatingRef.current) {
            return;
        }

        const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const currentRotation = rotationRef.current;
        const currentRackX = rackXRef.current;
        const nextRotation = currentRotation + (direction * toothAngle);
        const nextRackX = currentRackX - (direction * toothStep);

        const rotationOvershoot = direction * toothAngle * 0.2;
        const rackOvershoot = -direction * toothStep * 0.2;

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
        onStep?.(direction);
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
            </div>

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

            <span
                aria-hidden="true"
                className={`gear-slider-loading-icon ${isTampered ? 'is-tampered' : ''}`.trim()}
            >
                <HourglassEmptyRoundedIcon />
            </span>
        </div>
    );
};