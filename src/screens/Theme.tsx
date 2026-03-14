/**
 * Material UI Theme Configuration
 * Memoria visual language: ruin-tech, pale light, and weathered metal.
 */

import { createTheme } from '@mui/material/styles';

// Shared palette for all screen classes.
export const colors = {
  primary: {
    main: '#8ab0cc',
    light: '#b9d2e3',
    dark: '#5f7f9b',
    contrastText: '#edf2f2',
  },
  secondary: {
    main: '#89cd87',
    light: '#b5dfb3',
    dark: '#5f9360',
    contrastText: '#1a1e30',
  },
  accent: {
    lichen: '#7a7b6b',
    ember: '#b98f6e',
    signal: '#d9e9f7',
  },
  background: {
    default: '#1a1e30',
    paper: '#25293f',
    glass: 'rgba(138, 176, 204, 0.08)',
    glassLight: 'rgba(137, 205, 135, 0.14)',
  },
  text: {
    primary: '#edf2f2',
    secondary: '#b9d2e3',
    disabled: 'rgba(237, 242, 242, 0.42)',
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
    fontFamily: '"Space Grotesk", "Alegreya Sans SC", "Segoe UI", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      textShadow: '0 0 24px rgba(138, 176, 204, 0.26)',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textShadow: '0 0 18px rgba(137, 205, 135, 0.2)',
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
      letterSpacing: '0.08em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 0 10px rgba(138, 176, 204, 0.22)',
    '0 0 20px rgba(138, 176, 204, 0.28)',
    '0 0 30px rgba(137, 205, 135, 0.24)',
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
          boxShadow: '0 0 14px rgba(138, 176, 204, 0.24)',
          '&:hover': {
            boxShadow: '0 0 24px rgba(137, 205, 135, 0.3)',
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #5f7f9b 0%, #8ab0cc 45%, #89cd87 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6c90ae 0%, #9ac0dc 45%, #9ad897 100%)',
          },
        },
        outlined: {
          borderColor: colors.primary.main,
          borderWidth: '2px',
          color: colors.primary.main,
          '&:hover': {
            borderWidth: '2px',
            borderColor: colors.primary.light,
            backgroundColor: 'rgba(138, 176, 204, 0.1)',
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
          borderImageSource: 'linear-gradient(135deg, #8ab0cc, #89cd87)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(138, 176, 204, 0.4)',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(138, 176, 204, 0.62)',
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
          backgroundColor: 'rgba(122, 123, 107, 0.35)',
        },
        bar: {
          borderRadius: 5,
          background: 'linear-gradient(90deg, #5f7f9b 0%, #8ab0cc 45%, #89cd87 100%)',
          boxShadow: '0 0 10px rgba(138, 176, 204, 0.45)',
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
            backgroundColor: 'rgba(138, 176, 204, 0.16)',
          },
        },
      },
    },
  },
});

export default theme;
