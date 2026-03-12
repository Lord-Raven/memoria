/**
 * Material UI Theme Configuration
 * Mysterious post-apocalyptic sci-fi meets fantasy vibe:
 */

import { createTheme } from '@mui/material/styles';

// Color palette inspired by classic game shows
export const colors = {
  primary: {
    main: '#FF1493',      // Hot pink - main accent
    light: '#FF69B4',     // Light pink
    dark: '#C71585',      // Deep pink
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FFD700',      // Gold - secondary accent
    light: '#FFED4E',     // Light gold
    dark: '#FFA500',      // Orange gold
    contrastText: '#000000',
  },
  accent: {
    purple: '#9370DB',    // Medium purple
    cyan: '#00CED1',      // Dark cyan
    coral: '#FF7F50',     // Coral
  },
  background: {
    default: '#1a0a2e',   // Deep purple-black
    paper: '#240741',     // Dark purple
    glass: 'rgba(255, 20, 147, 0.08)', // Semi-transparent pink
    glassLight: 'rgba(255, 215, 0, 0.12)', // Semi-transparent gold
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#FFD700',
    disabled: 'rgba(255, 255, 255, 0.38)',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.primary,
    secondary: colors.secondary,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: colors.text,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      textShadow: '0 0 20px rgba(255, 20, 147, 0.6), 0 0 40px rgba(255, 20, 147, 0.4)',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'uppercase',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 0 10px rgba(255, 20, 147, 0.3)',
    '0 0 20px rgba(255, 20, 147, 0.4)',
    '0 0 30px rgba(255, 20, 147, 0.5)',
    '0 4px 20px rgba(0, 0, 0, 0.5)',
    '0 6px 25px rgba(0, 0, 0, 0.6)',
    '0 8px 30px rgba(0, 0, 0, 0.7)',
    '0 10px 35px rgba(0, 0, 0, 0.8)',
    '0 12px 40px rgba(0, 0, 0, 0.9)',
    '0 14px 45px rgba(0, 0, 0, 0.95)',
    '0 16px 50px rgba(0, 0, 0, 1)',
    '0 18px 55px rgba(0, 0, 0, 1)',
    '0 20px 60px rgba(0, 0, 0, 1)',
    '0 22px 65px rgba(0, 0, 0, 1)',
    '0 24px 70px rgba(0, 0, 0, 1)',
    '0 26px 75px rgba(0, 0, 0, 1)',
    '0 28px 80px rgba(0, 0, 0, 1)',
    '0 30px 85px rgba(0, 0, 0, 1)',
    '0 32px 90px rgba(0, 0, 0, 1)',
    '0 34px 95px rgba(0, 0, 0, 1)',
    '0 36px 100px rgba(0, 0, 0, 1)',
    '0 38px 105px rgba(0, 0, 0, 1)',
    '0 40px 110px rgba(0, 0, 0, 1)',
    '0 42px 115px rgba(0, 0, 0, 1)',
    '0 44px 120px rgba(0, 0, 0, 1)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 15px rgba(255, 20, 147, 0.3)',
          '&:hover': {
            boxShadow: '0 0 25px rgba(255, 20, 147, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #FF1493 0%, #C71585 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
          },
        },
        outlined: {
          borderColor: colors.primary.main,
          borderWidth: '2px',
          color: colors.primary.main,
          '&:hover': {
            borderWidth: '2px',
            borderColor: colors.primary.light,
            backgroundColor: 'rgba(255, 20, 147, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.background.paper,
          border: '2px solid',
          borderImageSlice: 1,
          borderImageSource: 'linear-gradient(135deg, #FF1493, #FFD700)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 215, 0, 0.3)',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 215, 0, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.secondary.main,
            },
          },
          '& .MuiInputLabel-root': {
            color: colors.text.secondary,
            '&.Mui-focused': {
              color: colors.secondary.main,
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 10,
          borderRadius: 5,
          backgroundColor: 'rgba(255, 215, 0, 0.15)',
        },
        bar: {
          borderRadius: 5,
          background: 'linear-gradient(90deg, #FF1493 0%, #FFD700 100%)',
          boxShadow: '0 0 10px rgba(255, 20, 147, 0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.glass,
          border: `1px solid ${colors.primary.main}`,
          color: colors.text.primary,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: 'rgba(255, 20, 147, 0.15)',
          },
        },
      },
    },
  },
});

export default theme;
