/** Versioned save data persisted in localStorage behind a small adapter. */
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'borrador.save';

export type AbilityId = 'complete';

export interface SaveData {
  readonly version: number;
  readonly checkpointId: string;
  readonly notes: readonly string[];
  readonly abilities: readonly AbilityId[];
  readonly flags: readonly string[];
  readonly finishedStory: boolean;
  readonly assistMode: boolean;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createDefaultSave(startCheckpoint: string): SaveData {
  return {
    version: SAVE_VERSION,
    checkpointId: startCheckpoint,
    notes: [],
    abilities: [],
    flags: [],
    finishedStory: false,
    assistMode: false,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Validate unknown JSON. Returns null for anything that is not a valid current-version save. */
export function parseSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== SAVE_VERSION) return null;
  if (typeof data.checkpointId !== 'string') return null;
  if (!isStringArray(data.notes) || !isStringArray(data.flags)) return null;
  if (!isStringArray(data.abilities) || !data.abilities.every((a) => a === 'complete')) return null;
  if (typeof data.finishedStory !== 'boolean' || typeof data.assistMode !== 'boolean') return null;
  return {
    version: SAVE_VERSION,
    checkpointId: data.checkpointId,
    notes: data.notes,
    abilities: data.abilities as AbilityId[],
    flags: data.flags,
    finishedStory: data.finishedStory,
    assistMode: data.assistMode,
  };
}

export class SaveStore {
  private readonly storage: StorageAdapter | null;

  constructor(storage: StorageAdapter | null) {
    this.storage = storage;
  }

  load(): SaveData | null {
    const text = this.storage?.getItem(SAVE_KEY);
    if (!text) return null;
    try {
      return parseSave(JSON.parse(text));
    } catch {
      return null;
    }
  }

  save(data: SaveData): void {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be full or blocked (private mode). The game keeps working without saves.
    }
  }

  clear(): void {
    this.storage?.removeItem(SAVE_KEY);
  }
}
