import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/config/palette';
import { WARDROBE_TEXT } from '../src/content/script';
import {
  ACCESSORY_IDS,
  isAccessoryId,
  isUnlocked,
  newlyUnlocked,
  type Progress,
  stepSlot,
  WARDROBE_SLOTS,
} from '../src/core/accessories';
import { createDefaultSave, parseSave } from '../src/core/save';
import { accessorySheet, GEAR_PAD, gearKey } from '../src/gfx/accessories';
import { withEyesShifted } from '../src/gfx/clawdLook';
import { CLAWD_FRAME, CLAWD_POSES } from '../src/gfx/clawdPoses';

const FRESH: Progress = { notes: 0, totalNotes: 6, rivalsBeaten: 0, totalRivals: 3 };
const ALL_NOTES: Progress = { ...FRESH, notes: 6 };
const ALL_RIVALS: Progress = { ...FRESH, rivalsBeaten: 3 };

/** Clawd's colors and the danger magenta stay off accessories. */
const RESERVED = [
  COLORS.clawdBody,
  COLORS.clawdShade,
  COLORS.clawdLight,
  COLORS.clawdEye,
  COLORS.danger,
].map((color) => color.toUpperCase());

describe('accessory unlocks', () => {
  it('starts with headphones, glasses and beanie', () => {
    expect(ACCESSORY_IDS.filter((id) => isUnlocked(id, FRESH))).toEqual([
      'headphones',
      'glasses',
      'beanie',
    ]);
  });

  it('unlocks the cap with every note and the crown with every rival', () => {
    expect(isUnlocked('cap', ALL_NOTES)).toBe(true);
    expect(isUnlocked('crown', ALL_NOTES)).toBe(false);
    expect(isUnlocked('crown', ALL_RIVALS)).toBe(true);
    expect(newlyUnlocked(FRESH, ALL_RIVALS)).toEqual(['crown']);
    expect(newlyUnlocked(ALL_RIVALS, ALL_RIVALS)).toEqual([]);
  });

  it('has a name, a description and an unlock hint for every accessory', () => {
    for (const id of ACCESSORY_IDS) {
      expect(WARDROBE_TEXT.items[id].name.length).toBeGreaterThan(0);
      expect(WARDROBE_TEXT.items[id].detail.length).toBeGreaterThan(0);
    }
  });
});

describe('wardrobe cursor', () => {
  it('starts with bare Clawd and wraps around both ends', () => {
    expect(WARDROBE_SLOTS[0]).toBeNull();
    const last = WARDROBE_SLOTS.length - 1;
    expect(stepSlot(0, -1)).toBe(last);
    expect(stepSlot(last, 1)).toBe(0);
    expect(stepSlot(2, 1)).toBe(3);
  });
});

describe('saved accessory', () => {
  it('defaults to none and survives a round trip', () => {
    expect(createDefaultSave('c1').accessory).toBeNull();
    const save = { ...createDefaultSave('c1'), accessory: 'headphones' as const };
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.accessory).toBe('headphones');
  });

  it('loads older or tampered saves as bare Clawd instead of rejecting them', () => {
    const { accessory: _, ...old } = createDefaultSave('c1');
    expect(parseSave(old)?.accessory).toBeNull();
    expect(parseSave({ ...old, accessory: 'jetpack' })?.accessory).toBeNull();
    expect(isAccessoryId('crown')).toBe(true);
  });
});

describe('accessory sheets', () => {
  const clawdWidth = CLAWD_POSES.frames[0]?.[0]?.length ?? 0;
  const clawdHeight = CLAWD_POSES.frames[0]?.length ?? 0;

  describe.each(ACCESSORY_IDS)('%s', (id) => {
    const sheet = accessorySheet(CLAWD_POSES, id);

    it('has one frame per Clawd frame, padded the same way every time', () => {
      expect(sheet.frames).toHaveLength(CLAWD_POSES.frames.length);
      for (const frame of sheet.frames) {
        expect(frame).toHaveLength(clawdHeight + GEAR_PAD.top);
        for (const row of frame) expect(row).toHaveLength(clawdWidth + GEAR_PAD.side * 2);
      }
    });

    it('only uses its own palette, never Clawd brand colors or danger magenta', () => {
      for (const frame of sheet.frames) {
        for (const char of frame.join('')) {
          if (char !== '.') expect(sheet.palette).toHaveProperty(char);
        }
      }
      for (const color of Object.values(sheet.palette)) {
        expect(RESERVED).not.toContain(color.toUpperCase());
      }
    });

    it('paints something on the front-facing idle frame', () => {
      expect(sheet.frames[CLAWD_FRAME.idle]?.join('')).toMatch(/[^.]/);
    });

    it('has a texture key per Clawd look', () => {
      expect(gearKey('clawdLeft', id)).toBe(`clawdLeft:${id}`);
    });
  });

  it('moves the glasses with the eyes and hides them on the back view', () => {
    const lensColumn = (sheet: ReturnType<typeof accessorySheet>): number =>
      sheet.frames[CLAWD_FRAME.idle]?.findIndex((row) => row.includes('k')) ?? -1;
    const firstLens = (sheet: ReturnType<typeof accessorySheet>): number => {
      const row = sheet.frames[CLAWD_FRAME.idle]?.[lensColumn(sheet)] ?? '';
      return row.indexOf('k');
    };
    const center = accessorySheet(CLAWD_POSES, 'glasses');
    const left = accessorySheet(withEyesShifted(CLAWD_POSES, -1), 'glasses');
    expect(firstLens(left)).toBe(firstLens(center) - 1);
    expect(center.frames[CLAWD_FRAME.back]?.join('')).toMatch(/^\.+$/);
  });
});
