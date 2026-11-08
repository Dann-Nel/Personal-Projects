// Contrast ratios (WCAG) checked against the stated backgrounds:
// text/bg 16:1, muted/bg 8.9:1, muted/surface 7.9:1, onAccent/accent 8.2:1, text/ghost 10.5:1
export const colors = {
  bg: '#14112b',
  surface: '#1f1b43',
  surfaceRaised: '#2a2556',
  ghost: '#3a3470',
  text: '#ffffff',
  textSoft: '#d8d4f5',
  textMuted: '#b9b4e0',
  accent: '#f59e6b',
  onAccent: '#14112b',
  warn: '#f5c76b',
  danger: '#ff9a9a',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 24 } as const;
export const MIN_TOUCH = 48; // dp, Android accessibility minimum
