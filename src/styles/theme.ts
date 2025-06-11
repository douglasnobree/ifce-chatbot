import { type ThemeConfig } from '@/types/theme';

// Cores institucionais do IFCE
const ifceColors = {
  // Verde IFCE
  primary: {
    DEFAULT: '#1E8449',
    foreground: '#FFFFFF',
    50: '#E8F6EF',
    100: '#D1EDE0',
    200: '#A4DBC0',
    300: '#76C9A1',
    400: '#49B781',
    500: '#1E8449',
    600: '#186A3B',
    700: '#12502D',
    800: '#0C361E',
    900: '#061B0F',
  },
  // Cores secundárias
  secondary: {
    DEFAULT: '#F2F2F2',
    foreground: '#1E8449',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Cores de destaque
  accent: {
    DEFAULT: '#F39C12',
    foreground: '#FFFFFF',
  },
  // Cores de erro/destruição
  destructive: {
    DEFAULT: '#E74C3C',
    foreground: '#FFFFFF',
  },
};

export const theme: ThemeConfig = {
  light: {
    background: '#FFFFFF',
    foreground: '#111111',
    card: '#FFFFFF',
    'card-foreground': '#111111',
    popover: '#FFFFFF',
    'popover-foreground': '#111111',
    primary: ifceColors.primary.DEFAULT,
    'primary-foreground': ifceColors.primary.foreground,
    secondary: ifceColors.secondary.DEFAULT,
    'secondary-foreground': ifceColors.secondary.foreground,
    muted: '#F2F2F2',
    'muted-foreground': '#71717A',
    accent: ifceColors.accent.DEFAULT,
    'accent-foreground': ifceColors.accent.foreground,
    destructive: ifceColors.destructive.DEFAULT,
    'destructive-foreground': ifceColors.destructive.foreground,
    border: '#E2E8F0',
    input: '#E2E8F0',
    ring: ifceColors.primary[300],
  },
  dark: {
    background: '#111111',
    foreground: '#FFFFFF',
    card: '#1E1E1E',
    'card-foreground': '#FFFFFF',
    popover: '#1E1E1E',
    'popover-foreground': '#FFFFFF',
    primary: ifceColors.primary[300],
    'primary-foreground': '#111111',
    secondary: '#2A2A2A',
    'secondary-foreground': '#FFFFFF',
    muted: '#2A2A2A',
    'muted-foreground': '#A1A1AA',
    accent: ifceColors.accent.DEFAULT,
    'accent-foreground': '#111111',
    destructive: ifceColors.destructive.DEFAULT,
    'destructive-foreground': '#FFFFFF',
    border: 'rgba(255, 255, 255, 0.1)',
    input: 'rgba(255, 255, 255, 0.15)',
    ring: ifceColors.primary[500],
  },
};
