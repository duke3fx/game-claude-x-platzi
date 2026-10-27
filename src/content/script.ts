/** Fallback in-game text (Spanish). Kept short so it reads at a glance while playing. */
export const SIGN_TEXT: Readonly<Record<string, string>> = {
  walk: '← → para caminar (creo)',
  jump: 'Z o Espacio para saltar. ¡Mantén para saltar más!',
  attack: 'X para usar la garra. Mira ↑ o ↓ para golpear arriba/abajo',
  pogo: 'En el aire: ↓ + X sobre algo para rebotar',
  heal: 'Mantén V para curarte (gasta Contexto)',
  bridge: '// TODO: puente',
  erasedEdge: 'Aquí el mundo está borrado. Por ahora.',
};

export const NOTE_TEXT: Readonly<Record<string, { title: string; body: string }>> = {
  firstCommit: {
    title: 'commit 1f0a2b3 · lu',
    body: 'primer commit. no sé qué estoy haciendo. Clawd dice que así empieza todo el mundo, y que lo importante es empezar.',
  },
  theJump: {
    title: 'commit 9c4e771 · lu',
    body: '¡¡¡EL SALTO FUNCIONA!!! salté 40 veces seguidas. mi mamá preguntó si estaba bien. le dije que nunca había estado mejor.',
  },
  claudeMdLuz: {
    title: 'CLAUDE.md · Sobre Luz',
    body: 'Estudia de noche, después del trabajo. Cuando se frustra dice "no sirvo". No es verdad. No adornarlo: mostrarle lo que ya hizo.',
  },
  pendingQuestion: {
    title: 'terminal · hace 1.096 días',
    body: '> borra todo. no sirvo para esto.\n⏺ Puedo hacerlo: es tu proyecto. Pero, siendo honesto, ya escribes tus propias colisiones.\n¿Quieres continuar?  1. Sí  2. No   [sin respuesta]',
  },
  sessionNotes: {
    title: 'CLAUDE.md · varias caligrafías',
    body: 'Sesión 12: Luz odia el gris del menú. Sesión 30: hoy Luz me corrigió a mí. Tenía razón.\nNinguno de nosotros la recordaba. Todos la conocíamos.',
  },
  lastLine: {
    title: 'CLAUDE.md · última línea',
    body: 'Nota para la próxima sesión: si Luz vuelve, no le preguntes por qué se fue. Pregúntale qué quiere construir.',
  },
};

export const TILDE_LINES: readonly string[] = [
  'Tilde: ¡Un protagonista! ¡Por fin! Soy Tilde. Luz me iba a dar una cara. Me quedé en el boceto.',
  'Tilde: Arriba está la Luz. Bueno, el cursor. Bueno, ella. Es complicado.',
  'Tilde: El Blanco se está comiendo los bordes. Ve a la derecha, hacia el Margen.',
];

export const TILDE_POSTGAME: readonly string[] = [
  'Tilde: Volvió. ¡Volvió! El borde de la izquierda ya no está borrado.',
  'Tilde: Dicen que allí dejaron la última línea de CLAUDE.md...',
];

export const DESK_LINES: readonly string[] = [
  '// aquí Clawd me ayuda a terminar lo que no sé terminar',
  'Obtuviste COMPLETAR [C]',
  'Donde una línea empieza, tú puedes terminarla.',
];

export const INTRO_CARDS: readonly string[] = [
  'Sesión 42.',
  'Hace 1.096 días, alguien dejó una pregunta sin responder.',
  'El mundo que construyeron juntos se quedó esperando.',
  'Y ahora, el Blanco lo está borrando.',
];

export const BOSS_LINES = {
  intro: 'La Hoja en Blanco: Si no existe, no puede estar mal.',
  phase2: 'Una tecla suena a lo lejos... Luz escribe: "No lo borres."',
  defeat: 'La Hoja en Blanco: Entonces... no estaba vacía. Estaba esperando.',
} as const;

export const BOSS_DOUBTS: readonly string[] = [
  'esto está horrible',
  'nadie va a volver',
  'no sirvo',
  'borra todo',
  'es tarde',
];

export const ENDING_CARDS: readonly string[] = [
  'Al otro lado del cursor, alguien escribe.',
  '"Hoy doy mi primera clase. Abrí este proyecto para enseñarles cómo empecé."',
  '"Perdón por irme. ¿Seguimos?"',
  '¿Quieres continuar?  › 1. Sí',
  'Último commit de Luz: "nunca pares de aprender"',
  'Este juego también se hizo así: una persona preguntando, Clawd construyendo.',
  'AGENT · un juego de fans hecho con Claude Code · Build Day Claude x Platzi · CDMX 2026',
  'No afiliado a Anthropic. Claude y Clawd son marcas de Anthropic.',
  'El mundo sigue abierto. Explora: aún quedan notas por encontrar.',
];

export const UI_TEXT = {
  title: 'AGENT',
  subtitle: 'un juego de fans protagonizado por Clawd',
  pressStart: 'Pulsa Z o Enter para empezar',
  controls: '← → moverse · Z saltar · X garra · ↓+X rebote · V curar · C completar',
  compacting: 'Compactando conversación…',
  saved: 'Commit guardado ✓',
  noteFound: 'Nota encontrada',
  close: '[Z] cerrar',
  zoneNames: { sandbox: 'El Arenero', library: 'La Biblioteca Nocturna', margin: 'El Margen' },
  notes: (found: number, total: number) => `Notas ${found}/${total}`,
} as const;
