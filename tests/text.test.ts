import { describe, expect, it } from 'vitest';
import {
  BOSS_DOUBTS,
  CREDITS,
  DIALOGUES,
  type DialogueId,
  ENDING,
  INTRO,
  LUZ_TYPED,
  NOTES,
  type NoteId,
  SIGNS,
  type SignId,
  UI,
} from '../src/content/text';

const NOTE_IDS: readonly NoteId[] = [
  'firstCommit',
  'todoTree',
  'theJump',
  'claudeMdLuz',
  'loop0214',
  'sessionNotes',
  'pendingQuestion',
  'lastLine',
];

const DIALOGUE_IDS: readonly DialogueId[] = [
  'tildeIntro',
  'tildeLibrary',
  'tildeMargin',
  'tildePostgame',
  'echo17',
  'explore',
  'luzDesk',
  'bossIntro',
  'bossPhase2',
  'bossDefeat',
  'loopDefeat',
];

const SIGN_IDS: readonly SignId[] = [
  'walk',
  'jump',
  'attack',
  'pogo',
  'heal',
  'dash',
  'commit',
  'mirage',
  'bridge',
  'erasedEdge',
];

/** Palabras = fragmentos separados por espacios que contienen al menos una letra o un dígito. */
function wordCount(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function allDialogueText(id: DialogueId): string {
  return DIALOGUES[id].map((line) => line.text).join('\n');
}

describe('NOTES', () => {
  it('has exactly the 8 notes, each with title, meta and a body of at most 45 words', () => {
    expect(Object.keys(NOTES).sort()).toEqual([...NOTE_IDS].sort());
    for (const id of NOTE_IDS) {
      const note = NOTES[id];
      expect(note.title.trim(), id).not.toBe('');
      expect(note.meta.trim(), id).not.toBe('');
      expect(note.body.trim(), id).not.toBe('');
      expect(wordCount(note.body), id).toBeLessThanOrEqual(45);
    }
  });

  it('keeps the pending question tied to the unanswered prompt', () => {
    const note = NOTES.pendingQuestion;
    expect(note.body).toContain('¿Quieres continuar?');
    expect(`${note.meta} ${note.body}`).toContain('1.096');
  });
});

describe('DIALOGUES', () => {
  it('has every dialogue with 2–5 non-empty lines of at most 140 characters', () => {
    expect(Object.keys(DIALOGUES).sort()).toEqual([...DIALOGUE_IDS].sort());
    for (const id of DIALOGUE_IDS) {
      const lines = DIALOGUES[id];
      expect(lines.length, id).toBeGreaterThanOrEqual(2);
      expect(lines.length, id).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expect(typeof line.speaker, id).toBe('string');
        expect(line.text.trim(), id).not.toBe('');
        expect(line.text.length, `${id}: ${line.text}`).toBeLessThanOrEqual(140);
      }
    }
  });

  it('never gives Clawd a spoken line', () => {
    for (const id of DIALOGUE_IDS) {
      for (const line of DIALOGUES[id]) expect(line.speaker, id).not.toBe('Clawd');
    }
  });

  it('runs the COMPLETAR ceremony at Luz’s desk', () => {
    const text = allDialogueText('luzDesk');
    expect(text).toContain('// aquí Clawd me ayuda a terminar lo que no sé terminar');
    expect(text).toContain('Donde una línea empieza, tú puedes terminarla.');
    expect(text).toContain('C');
  });

  it('gives La Hoja en Blanco her voice and Luz her words in phase 2', () => {
    for (const id of ['bossIntro', 'bossPhase2', 'bossDefeat'] as const) {
      expect(
        DIALOGUES[id].some((line) => line.speaker === 'La Hoja en Blanco'),
        id,
      ).toBe(true);
    }
    expect(allDialogueText('bossPhase2')).toContain(LUZ_TYPED);
    expect(allDialogueText('bossDefeat')).toContain('Estaba esperando.');
  });

  it('breaks El Bucle with break;', () => {
    const text = allDialogueText('loopDefeat');
    expect(text).toContain('while (true)');
    expect(text).toContain('break;');
  });

  it('points the postgame player to every remaining secret', () => {
    const text = allDialogueText('tildePostgame');
    for (const hint of ['bucle', 'Biblioteca', 'Clawd de puntitos', 'mapas', 'Arenero']) {
      expect(text, hint).toContain(hint);
    }
  });
});

describe('SIGNS', () => {
  it('has every sign, each at most 60 characters', () => {
    expect(Object.keys(SIGNS).sort()).toEqual([...SIGN_IDS].sort());
    for (const id of SIGN_IDS) {
      expect(SIGNS[id].trim(), id).not.toBe('');
      expect(SIGNS[id].length, `${id}: ${SIGNS[id]}`).toBeLessThanOrEqual(60);
    }
  });

  it('states the real keys', () => {
    for (const key of ['←', '→', 'A', 'D']) expect(SIGNS.walk).toContain(key);
    for (const key of ['Z', 'Espacio']) expect(SIGNS.jump).toContain(key);
    expect(SIGNS.attack).toContain('X');
    for (const key of ['↓', 'X']) expect(SIGNS.pogo).toContain(key);
    for (const key of ['V', 'Contexto']) expect(SIGNS.heal).toContain(key);
    for (const key of ['C', 'Completar']) expect(SIGNS.dash).toContain(key);
    expect(SIGNS.commit).toContain('↑');
  });

  it('keeps the fixed signs', () => {
    expect(SIGNS.mirage).toContain('Si brilla demasiado, no tiene sombra...');
    expect(SIGNS.bridge).toBe('// TODO: puente');
  });
});

describe('INTRO / ENDING / CREDITS', () => {
  it('opens with 4–6 short cards starting at session 42', () => {
    expect(INTRO.length).toBeGreaterThanOrEqual(4);
    expect(INTRO.length).toBeLessThanOrEqual(6);
    for (const card of INTRO) expect(card.length, card).toBeLessThanOrEqual(110);
    expect(INTRO[0]?.startsWith('Sesión 42.')).toBe(true);
    expect(INTRO.join(' ')).toContain('1.096 días');
    expect(INTRO.join(' ')).toContain('sin responder');
    for (const rival of ['Luna', 'Brasa', 'Nébula']) expect(INTRO.join(' ')).toContain(rival);
  });

  it('closes with 5–8 cards: the best AI, the answer, the class, the meta line and the open world', () => {
    expect(ENDING.length).toBeGreaterThanOrEqual(5);
    expect(ENDING.length).toBeLessThanOrEqual(8);
    for (const card of ENDING) expect(card.length, card).toBeLessThanOrEqual(110);
    const text = ENDING.join('\n');
    expect(text).toContain('la mejor IA');
    expect(text).toContain('1. Sí');
    expect(text).toContain('primera clase');
    expect(text).toContain('nunca pares de aprender');
    expect(text).toContain(
      'Este juego también se hizo así: una persona preguntando, Clawd construyendo.',
    );
    expect(ENDING[ENDING.length - 1]).toContain('abierto');
  });

  it('credits the fan game and carries the legal line', () => {
    for (const line of [
      'AGENT',
      'un juego de fans hecho con Claude Code',
      'Build Day Claude x Platzi · CDMX 2026',
      'Equipo: (tu nombre aquí)',
      'No afiliado a Anthropic. Claude y Clawd son marcas de Anthropic.',
    ]) {
      expect(CREDITS).toContain(line);
    }
  });
});

describe('boss text', () => {
  it('rains 6–8 short doubts', () => {
    expect(BOSS_DOUBTS.length).toBeGreaterThanOrEqual(6);
    expect(BOSS_DOUBTS.length).toBeLessThanOrEqual(8);
    for (const doubt of BOSS_DOUBTS) {
      expect(doubt.trim()).not.toBe('');
      expect(doubt.length, doubt).toBeLessThanOrEqual(24);
    }
  });

  it('has Luz type exactly "No lo borres."', () => {
    expect(LUZ_TYPED).toBe('No lo borres.');
  });
});

describe('UI', () => {
  it('formats the notes counter', () => {
    const label = UI.notesFound(3, 8);
    expect(label).toContain('3');
    expect(label).toContain('8');
  });

  it('keeps "Claude" out of the product name', () => {
    expect(UI.title).toBe('AGENT');
    expect(UI.title).not.toMatch(/claude|clawd/i);
  });

  it('has no empty labels and names the three zones', () => {
    for (const [key, value] of Object.entries(UI)) {
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
    }
    expect(UI.zoneNames).toEqual({
      sandbox: 'El Arenero',
      library: 'La Biblioteca Nocturna',
      margin: 'El Margen',
    });
    expect(UI.compacting).toBe('Compactando conversación…');
    expect(UI.compactingSub).toBe('Reanudando desde el último commit');
  });
});
