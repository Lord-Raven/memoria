/**
 * Shared UI Components
 * Reusable components for the game.
 * Can use Material UI and Framer Motion, as desired.
 */

import React, { FC, ReactNode } from 'react';
import { Actor } from '../content/Actor';
import { motion, AnimatePresence } from 'framer-motion';
import { HourglassTop, HourglassBottom, Link } from '@mui/icons-material';
import { Box, lighten, Button as MuiButton, Chip as MuiChip, Typography } from '@mui/material';
import { useTooltip } from './TooltipContext';

/* ===============================================
   PANEL COMPONENTS (Using MUI Paper with custom styling)
   =============================================== */

interface GlassPanelProps {
	variant?: 'default' | 'bright';
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export const GlassPanel: FC<GlassPanelProps> = ({ 
	variant = 'default', 
	children,
	style,
}) => {
	return (
		<Box 
			className={variant === 'bright' ? 'glass-panel-bright' : 'glass-panel'}
			sx={{
				padding: '24px',
				...style
			}}
		>
			{children}
		</Box>
	);
};

/* ===============================================
   BUTTON COMPONENTS (Wrapping MUI Button)
   =============================================== */

interface ButtonProps {
	variant?: 'primary' | 'secondary' | 'menu';
	children: ReactNode;
	disabled?: boolean;
	onClick?: () => void;
	style?: React.CSSProperties;
	className?: string;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}

export const Button: FC<ButtonProps> = ({ 
	variant = 'primary', 
	children, 
	disabled = false,
	onClick,
	className = '',
	style,
	onMouseEnter,
	onMouseLeave,
}) => {
	const buttonClass = `btn-${variant}`;
	
	return (
		<motion.button
			className={`${buttonClass} ${className}`}
			disabled={disabled}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			whileHover={!disabled ? { scale: variant === 'menu' ? 1 : 1.03 } : {}}
			whileTap={!disabled ? { scale: 0.98 } : {}}
			style={{
				height: 'fit-content',
				alignSelf: 'center',
				...style
			}}
		>
			{children}
		</motion.button>
	);
};

/* ===============================================
   BACKGROUND COMPONENTS
   =============================================== */

interface GridOverlayProps {
	size?: number;
}

export const GridOverlay: FC<GridOverlayProps> = ({ size = 60 }) => {
	return (
		<div 
			className="grid-overlay"
			style={{
				backgroundSize: `${size}px ${size}px`
			}}
		/>
	);
};

/* ===============================================
   PROGRESS INDICATORS (Custom for gameshow theme)
   =============================================== */

interface TurnIndicatorProps {
	currentTurn: number;
	totalTurns: number;
}

export const TurnIndicator: FC<TurnIndicatorProps> = ({ currentTurn, totalTurns }) => {
	return (
		<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
			{Array.from({ length: totalTurns }).map((_, index) => {
				const isSpent = index < currentTurn;
				const HourglassIcon = isSpent ? HourglassTop : HourglassBottom;
				
				return (
					<motion.div
						key={index}
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ 
							duration: 0.3, 
							delay: index * 0.1,
							ease: "easeOut"
						}}
						whileHover={{ 
							scale: 1.2,
							transition: { duration: 0.2 }
						}}
					>
						<HourglassIcon
							sx={{
								color: isSpent ? 'rgba(255, 215, 0, 0.4)' : '#FFD700',
								filter: isSpent ? 'none' : 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))',
								fontSize: '28px',
							}}
						/>
					</motion.div>
				);
			})}
		</Box>
	);
};

/* ===============================================
   TEXT COMPONENTS (Using MUI Typography)
   =============================================== */

interface TitleProps {
	variant?: 'primary' | 'glow';
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Title: FC<TitleProps> = ({ 
	variant = 'primary', 
	children,
	style,
	className = ''
}) => {
	const textClass = variant === 'primary' ? 'text-glow-primary' : 'text-gradient';
	
	return (
		<Typography 
			variant="h1" 
			className={`${textClass} ${className}`} 
			sx={{ 
				fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
				...style 
			}}
		>
			{children}
		</Typography>
	);
};

/* ===============================================
   NAMEPLATE COMPONENT
   =============================================== */

interface NamePlateProps {
	actor?: Actor;
	style?: React.CSSProperties;
	className?: string;
}

export const NamePlate: FC<NamePlateProps> = ({
	actor,
	style,
	className = ''
}) => {
	if (!actor) {
		return null;
	}

	const themeColor = actor.themeColor || '#FFD700';
	const lightColor = lighten(themeColor, 0.6);
	const { setTooltip, clearTooltip } = useTooltip();

	const hoverText = actor.fullPath ? `Visit ${actor.name} by ${actor.fullPath.split('/')[0]}` : '';
	const link = actor.fullPath ? `https://chub.ai/characters/${actor.fullPath}` : null;

	return (
		<Box
			component={link ? 'a' : 'div'}
			href={link || undefined}
			target={link ? '_blank' : undefined}
			rel={link ? 'noopener noreferrer' : undefined}
			className={className}
			onMouseEnter={() => link && setTooltip(hoverText, Link)}
			onMouseLeave={clearTooltip}
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative',
				overflow: 'hidden',
				borderRadius: '10px',
				background: `linear-gradient(135deg, rgba(40, 25, 70, 0.65) 0%, rgba(55, 35, 85, 0.6) 100%), 
					radial-gradient(circle at 50% 50%, ${themeColor}15, transparent 70%)`,
				backdropFilter: 'blur(12px)',
				border: '2px solid transparent',
				backgroundImage: `
					linear-gradient(135deg, rgba(40, 25, 70, 0.65) 0%, rgba(55, 35, 85, 0.6) 100%),
					radial-gradient(circle at 50% 50%, ${themeColor}15, transparent 70%),
					linear-gradient(135deg, ${themeColor}, ${themeColor})
				`,
				backgroundOrigin: 'border-box',
				backgroundClip: 'padding-box, padding-box, border-box',
				boxShadow: `0 6px 16px rgba(0, 0, 0, 0.5), 0 0 15px ${themeColor}40`,
				color: lightColor,
				textShadow: `0 0 8px ${themeColor}80, 0 2px 4px rgba(0, 0, 0, 0.8)`,
				fontWeight: 700,
				fontSize: '1.2rem',
				padding: '2px 6px',
				minHeight: '30px',
				cursor: link ? 'pointer' : 'default',
				textDecoration: 'none',
				...style,
				'&::after': {
					content: '""',
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 60%)',
					opacity: 0.5,
					pointerEvents: 'none'
				}
			}}
		>
			<span
				style={{
					fontFamily: actor.themeFontFamily || 'inherit',
					position: 'relative',
					zIndex: 1,
					fontSize: 'inherit'
				}}
			>
				{actor.name}
			</span>
		</Box>
	);
};

/* ===============================================
   INPUT COMPONENTS (Using MUI TextField)
   =============================================== */

interface TextInputProps {
	fullWidth?: boolean;
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	placeholder?: string;
	id?: string;
	style?: React.CSSProperties;
	className?: string;
}

export const TextInput: FC<TextInputProps> = ({ 
	fullWidth = false,
	className = '',
	style,
	...props 
}) => {
	return (
		<input
			className={`input-base ${className}`}
			style={{
				width: fullWidth ? '100%' : 'auto',
				...style
			}}
			{...props}
		/>
	);
};

/* ===============================================
   CHIP/BADGE COMPONENTS (Using MUI Chip)
   =============================================== */

interface ChipProps {
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Chip: FC<ChipProps> = ({ 
	children,
	style,
	className = ''
}) => {
	return (
		<MuiChip 
			label={children}
			className={className}
			sx={{ ...style }}
		/>
	);
};

/* ===============================================
   EXPANDABLE MENU ITEM
   =============================================== */

interface MenuItemProps {
	title: string;
	isExpanded: boolean;
	onToggle: () => void;
	children: ReactNode;
}

export const MenuItem: FC<MenuItemProps> = ({ 
	title, 
	isExpanded, 
	onToggle, 
	children 
}) => {
	const [isHovered, setIsHovered] = React.useState(false);
	
	return (
		<motion.div 
			layout
			style={{ margin: '10px 0' }}
			animate={{ x: isHovered ? 10 : 0 }}
			transition={{ 
				layout: { duration: 0.3, ease: 'easeInOut' },
				x: { duration: 0.2, ease: 'easeOut' }
			}}
		>
			<motion.button
				onClick={onToggle}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				whileTap={{ scale: 0.95 }}
				className="btn-menu"
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					background: isExpanded ? 'rgba(255, 20, 147, 0.15)' : 'transparent',
				}}
			>
				<span>{title}</span>
				<motion.span
					animate={{ rotate: isExpanded ? 180 : 0 }}
					transition={{ duration: 0.3 }}
				>
					▼
				</motion.span>
			</motion.button>
			
			<motion.div
				layout
				initial={{ height: 0, opacity: 0 }}
				animate={{ 
					height: isExpanded ? 'auto' : 0,
					opacity: isExpanded ? 1 : 0
				}}
				transition={{ 
					height: { duration: 0.3, ease: 'easeInOut' },
					opacity: { duration: 0.2, ease: 'easeInOut' }
				}}
				style={{ 
					overflow: 'hidden',
					background: 'rgba(36, 7, 65, 0.7)',
					border: isExpanded ? '2px solid rgba(255, 20, 147, 0.3)' : 'none',
					borderTop: 'none',
					borderRadius: '0 0 8px 8px',
				}}
			>
				<div style={{ padding: '15px' }}>
					{children}
				</div>
			</motion.div>
		</motion.div>
	);
};
/* ===============================================
   CONFIRM DIALOG COMPONENT
   =============================================== */

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
	isOpen,
	title,
	message,
	confirmText = 'Continue',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
}) => {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.75)',
						backdropFilter: 'blur(4px)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 2000,
						padding: '20px',
					}}
					onClick={onCancel}
				>
					<motion.div
						initial={{ scale: 0.9, y: 20 }}
						animate={{ scale: 1, y: 0 }}
						exit={{ scale: 0.9, y: 20 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
						onClick={(e) => e.stopPropagation()}
						style={{
							background: 'linear-gradient(135deg, rgba(36, 7, 65, 0.95) 0%, rgba(26, 10, 46, 0.95) 100%)',
							border: '2px solid rgba(255, 20, 147, 0.5)',
							borderRadius: '12px',
							padding: '30px',
							maxWidth: '500px',
							width: '100%',
							boxShadow: '0 10px 40px rgba(255, 20, 147, 0.3)',
						}}
					>
						{/* Title */}
						<Typography
							variant="h5"
							className="text-gradient"
							sx={{
								fontSize: '24px',
								fontWeight: 'bold',
								marginBottom: '16px',
								textAlign: 'center',
							}}
						>
							{title}
						</Typography>

						{/* Message */}
						<Typography
							sx={{
								color: 'rgba(255, 255, 255, 0.85)',
								fontSize: '16px',
								lineHeight: 1.6,
								marginBottom: '24px',
								textAlign: 'center',
							}}
						>
							{message}
						</Typography>

						{/* Action Buttons */}
						<div
							style={{
								display: 'flex',
								gap: '12px',
								justifyContent: 'center',
							}}
						>
							<Button variant="secondary" onClick={onCancel}>
								{cancelText}
							</Button>
							<Button variant="primary" onClick={onConfirm}>
								{confirmText}
							</Button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};