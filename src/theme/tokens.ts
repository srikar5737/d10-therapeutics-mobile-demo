/**
 * D-10 Therapeutics — Design Tokens
 * Derived from the approved Stitch Material Design 3 palette.
 */

export const Colors = {
  // Primary (Stitch Teal)
  primary: '#008080',
  primaryContainer: '#00a3a3',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#e0ffff',
  primaryFixed: '#b2f0f0',
  primaryFixedDim: '#80e0e0',
  inversePrimary: '#80e0e0',

  // Secondary (Calm Blue-Gray)
  secondary: '#4a6363',
  secondaryContainer: '#cce5e5',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#002020',
  secondaryFixed: '#cce5e5',

  // Tertiary (caution / orange-brown)
  tertiary: '#7b3200',
  tertiaryContainer: '#a04401',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#ffd1bc',
  tertiaryFixed: '#ffdbcb',
  tertiaryFixedDim: '#ffb691',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Surface system
  surface: '#f7f9ff',
  surfaceDim: '#d8dae0',
  surfaceBright: '#f7f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef4',
  surfaceContainerHigh: '#e6e8ee',
  surfaceContainerHighest: '#e0e2e8',
  surfaceVariant: '#e0e2e8',

  // On-surface
  onSurface: '#191c20',
  onSurfaceVariant: '#424752',
  onBackground: '#191c20',
  inverseSurface: '#2d3135',
  inverseOnSurface: '#eff1f6',

  // Outline
  outline: '#727783',
  outlineVariant: '#c2c6d4',

  // Semantic helpers
  success: '#2e7d32',
  successContainer: '#c8e6c9',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  hero: 32,
  display: 48,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#191c20',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#191c20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#191c20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;
