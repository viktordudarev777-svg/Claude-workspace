import { useColorScheme } from 'react-native';
import type { TrafficLight, RiskLevel, FlagSeverity } from '../api/types';

/**
 * The traffic light is the whole product, so its three colours are fixed
 * points of the design: everything else is chosen to stay readable next to
 * them, in both light and dark mode.
 */
const PALETTE = {
  green: '#1B873F',
  greenSoft: '#E4F5E9',
  greenDark: '#3DD68C',
  greenSoftDark: '#12301F',

  yellow: '#B87503',
  yellowSoft: '#FDF3DD',
  yellowDark: '#F5B84C',
  yellowSoftDark: '#332707',

  red: '#C42B1C',
  redSoft: '#FCE9E7',
  redDark: '#FF6B5B',
  redSoftDark: '#3A1512',
} as const;

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  light: Record<TrafficLight, string>;
  lightSoft: Record<TrafficLight, string>;
  spacing: (steps: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
}

const lightTheme: Theme = {
  dark: false,
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  border: '#E2E5EA',
  text: '#14181F',
  textMuted: '#5C6672',
  accent: '#1F6FEB',
  light: { green: PALETTE.green, yellow: PALETTE.yellow, red: PALETTE.red },
  lightSoft: { green: PALETTE.greenSoft, yellow: PALETTE.yellowSoft, red: PALETTE.redSoft },
  spacing: (steps) => steps * 8,
  radius: { sm: 8, md: 14, lg: 20, pill: 999 },
};

const darkTheme: Theme = {
  ...lightTheme,
  dark: true,
  background: '#0E1116',
  surface: '#171B22',
  surfaceAlt: '#1F242C',
  border: '#2A303A',
  text: '#F2F4F7',
  textMuted: '#98A2B3',
  accent: '#5B9DFF',
  light: { green: PALETTE.greenDark, yellow: PALETTE.yellowDark, red: PALETTE.redDark },
  lightSoft: { green: PALETTE.greenSoftDark, yellow: PALETTE.yellowSoftDark, red: PALETTE.redSoftDark },
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/** Risk levels reuse the traffic-light colours so one glance means one thing. */
export function riskColor(theme: Theme, risk: RiskLevel): string {
  switch (risk) {
    case 'high':
      return theme.light.red;
    case 'moderate':
      return theme.light.yellow;
    case 'low':
      return theme.textMuted;
    default:
      return theme.light.green;
  }
}

export function severityColor(theme: Theme, severity: FlagSeverity): string {
  switch (severity) {
    case 'danger':
      return theme.light.red;
    case 'warning':
      return theme.light.yellow;
    default:
      return theme.accent;
  }
}
