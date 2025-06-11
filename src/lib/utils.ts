import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { theme } from '@/styles/theme';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Obtém a cor do tema de acordo com o modo (claro ou escuro)
 * @param colorKey A chave da cor no tema
 * @param mode O modo do tema ('light' | 'dark')
 * @returns A cor correspondente ao tema
 */
export function getThemeColor(
  colorKey: keyof typeof theme.light,
  mode: 'light' | 'dark' = 'light'
) {
  return theme[mode][colorKey];
}
