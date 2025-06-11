import { theme } from './theme';

const shadcnConfig = {
  theme,
  cssVariables: true,
  cssPrefix: '',
  radius: {
    sm: '0.375rem', // calc(var(--radius) - 4px)
    md: '0.5rem', // calc(var(--radius) - 2px)
    lg: '0.625rem', // var(--radius)
    xl: '1rem', // calc(var(--radius) + 4px)
  },
  spacing: {
    '1': '0.25rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '16': '4rem',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontFamilies: {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
  },
};

export default shadcnConfig;
