/** Cosmetic accessories Clawd can wear, chosen at a bench (like charms in Hollow Knight). */
export const ACCESSORY_IDS = ['headphones', 'glasses', 'beanie', 'cap', 'crown'] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

/** What a player has done so far, as far as unlocks care. */
export interface Progress {
  readonly notes: number;
  readonly totalNotes: number;
  readonly rivalsBeaten: number;
  readonly totalRivals: number;
}

export type Unlock = 'start' | 'allNotes' | 'allRivals';

export const ACCESSORY_UNLOCK: Readonly<Record<AccessoryId, Unlock>> = {
  headphones: 'start',
  glasses: 'start',
  beanie: 'start',
  cap: 'allNotes',
  crown: 'allRivals',
};

export function isAccessoryId(value: unknown): value is AccessoryId {
  return typeof value === 'string' && (ACCESSORY_IDS as readonly string[]).includes(value);
}

export function isUnlocked(id: AccessoryId, progress: Progress): boolean {
  switch (ACCESSORY_UNLOCK[id]) {
    case 'start':
      return true;
    case 'allNotes':
      return progress.totalNotes > 0 && progress.notes >= progress.totalNotes;
    case 'allRivals':
      return progress.totalRivals > 0 && progress.rivalsBeaten >= progress.totalRivals;
    default:
      return false;
  }
}

/** Accessories unlocked by going from `before` to `after`, in wardrobe order. */
export function newlyUnlocked(before: Progress, after: Progress): AccessoryId[] {
  return ACCESSORY_IDS.filter((id) => !isUnlocked(id, before) && isUnlocked(id, after));
}

/** Wardrobe slots in order: bare Clawd first, then every accessory. */
export const WARDROBE_SLOTS: readonly (AccessoryId | null)[] = [null, ...ACCESSORY_IDS];

/** Moves the wardrobe cursor one slot, wrapping around at both ends. */
export function stepSlot(index: number, direction: number): number {
  const count = WARDROBE_SLOTS.length;
  return (((index + Math.sign(direction)) % count) + count) % count;
}
