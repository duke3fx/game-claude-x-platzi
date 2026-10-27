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
  sandbox: {
    background: '#1F1E1D',
    far: '#262624',
    mid: '#30302E',
    solid: '#3D3D3A',
    solidEdge: '#87867F',
    fog: '#BCD1CA',
    accent: '#788C5D',
  },
  library: {
    background: '#151431',
    far: '#1D1B40',
    mid: '#2C2A5C',
    solid: '#262449',
    solidEdge: '#6A9BCC',
    fog: '#CBCADB',
    accent: '#EBC9B7',
  },
  margin: {
    background: '#E8E6DC',
    far: '#F0EEE6',
    mid: '#E3DACC',
    solid: '#B0AEA5',
    solidEdge: '#141413',
    fog: '#FFFFFF',
    accent: '#141413',
  },
};

/** Convert '#RRGGBB' to the 0xRRGGBB number Phaser expects. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}
