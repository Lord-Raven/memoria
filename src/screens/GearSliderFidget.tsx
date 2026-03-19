import { FC, CSSProperties, useMemo, useState } from 'react';
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

    const toothAngle = 360 / toothCount;
    const toothStep = rackWidth / toothCount; //(2 * Math.PI * ((gearSize * pitchRadiusRatio) / 2)) / toothCount;

    const handleTurn = async () => {
        if (disabled || isAnimating) {
            return;
        }

        const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const nextRotation = rotation + (direction * toothAngle);
        const nextRackX = rackX - (direction * toothStep);

        const rotationOvershoot = direction * toothAngle * 0.2;
        const rackOvershoot = -direction * toothStep * 0.2;

        setIsAnimating(true);
        await Promise.all([
            gearControls.start({
                rotate: [rotation, nextRotation + rotationOvershoot, nextRotation],
                transition: {
                    duration: 0.36,
                    times: [0, 0.74, 1],
                    ease: 'easeOut',
                },
            }),
            cogControls.start({
                rotate: [-rotation, -(nextRotation + rotationOvershoot), -nextRotation],
                transition: {
                    duration: 0.36,
                    times: [0, 0.74, 1],
                    ease: 'easeOut',
                },
            }),
            rackControls.start({
                x: [rackX, nextRackX + rackOvershoot, nextRackX],
                transition: {
                    duration: 0.4,
                    times: [0, 0.72, 1],
                    ease: 'easeOut',
                },
            }),
        ]);

        setRotation(nextRotation);
        setRackX(nextRackX);
        setIsAnimating(false);
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

            <span aria-hidden="true" className="gear-slider-loading-icon">
                <HourglassEmptyRoundedIcon />
            </span>
        </div>
    );
};