/** Colors derived from the Claude brand tokens plus the game-only danger magenta. */
export const COLORS = {
  clawdBody: '#D77757',
  clawdShade: '#C6613F',
  clawdLight: '#EB9F7F',
  clawdEye: '#141414',
  ink: '#141413',
  nearBlack: '#0F0F0E',
  ivory: '#FAF9F5',
  ivoryMedium: '#F0EEE6',
  ivoryDark: '#E8E6DC',
  oat: '#E3DACC',
  cloudLight: '#D1CFC5',
  cloudMedium: '#B0AEA5',
  cloudDark: '#87867F',
  olive: '#788C5D',
  sky: '#6A9BCC',
  cactus: '#BCD1CA',
  heather: '#CBCADB',
  peach: '#EBC9B7',
  iris: '#4A3AA7',
  periwinkle: '#CDE2FB',
  error: '#BF4D43',
  fig: '#C46686',
  danger: '#FF3EC8',
  erased: '#FFFFFF',
} as const;

export type ZoneId = 'sandbox' | 'library' | 'margin';

export interface ZonePalette {
  readonly background: string;
  readonly far: string;
  readonly mid: string;
  readonly solid: string;
  readonly solidEdge: string;
  readonly fog: string;
  readonly accent: string;
}

export const ZONE_PALETTES: Readonly<Record<ZoneId, ZonePalette>> = {
  // Hollow-Knight-style atmospheric perspective: the playfield is a dark silhouette,
  // the backdrop gets lighter and foggier with distance.
  sandbox: {
    background: '#3A3B39',
    far: '#4A4C49',
    mid: '#2A2B29',
    solid: '#0E0E0D',
    solidEdge: '#9C9A92',
    fog: '#BCD1CA',
    accent: '#788C5D',
  },
  library: {
    background: '#2A3566',
    far: '#3A4A80',
    mid: '#1A2048',
    solid: '#07081A',
    solidEdge: '#6A9BCC',
    fog: '#CBCADB',
    accent: '#EBC9B7',
  },
  margin: {
    background: '#E8E6DC',
    far: '#D1CFC5',
    mid: '#B0AEA5',
    solid: '#1A1918',
    solidEdge: '#FAF9F5',
    fog: '#FFFFFF',
    accent: '#141413',
  },
};

/** Convert '#RRGGBB' to the 0xRRGGBB number Phaser expects. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}
