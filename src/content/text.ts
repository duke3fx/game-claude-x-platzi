/**
 * Todos los textos del juego (español LATAM neutro), centralizados para poder traducir después.
 * Solo datos: nada de Phaser ni lógica. Clawd nunca habla; su voz son las poses y lo que lee.
 */

// ─── Notas (coleccionables) ──────────────────────────────────────────────────

export type NoteId =
  | 'firstCommit'
  | 'todoTree'
  | 'theJump'
  | 'claudeMdLuz'
  | 'loop0214'
  | 'sessionNotes'
  | 'pendingQuestion'
  | 'lastLine';

export interface NoteText {
  readonly title: string;
  /** Origen de la nota, p. ej. "commit 1f0a2b3 · lu" o "CLAUDE.md". */
  readonly meta: string;
  readonly body: string;
}

/** Orden de inserción = orden narrativo del recorrido. */
export const NOTES: Readonly<Record<NoteId, NoteText>> = {
  firstCommit: {
    title: 'Primer commit',
    meta: 'commit 1f0a2b3 · lu',
    body: 'primer commit. no sé qué estoy haciendo. Clawd dice que así empieza todo el mundo, y que lo importante es empezar.',
  },
  todoTree: {
    title: '// TODO: árbol',
    meta: 'arenero.ts · lu',
    body: '// TODO: dibujar un árbol de verdad.\n// (Clawd dice que un cuadrado gris también es un árbol, mientras tanto. Que un placeholder es una promesa, no una mentira. Le creo. Por ahora.)',
  },
  theJump: {
    title: '¡¡EL SALTO!!',
    meta: 'commit 9c4e771 · lu',
    body: '¡¡¡EL SALTO FUNCIONA!!! salté 40 veces seguidas. mi mamá preguntó si estaba bien. le dije que nunca había estado mejor. gracias, Clawd de la sesión 17. ojalá te acuerdes de esto.',
  },
  claudeMdLuz: {
    title: 'Sobre Luz',
    meta: 'CLAUDE.md',
    body: '## Sobre Luz\nEstudia de noche, después del trabajo. Cuando se frustra dice "no sirvo". No es verdad. No adornarlo: mostrarle lo que ya hizo. Le sirve más que un elogio.',
  },
  loop0214: {
    title: '02:14',
    meta: 'commit 3d1c0de · lu',
    body: 'tercera noche con el bucle infinito. la laptop se congeló otra vez. Clawd dice que al bucle le falta una salida. creo que a mí también. me voy a dormir.',
  },
  sessionNotes: {
    title: 'Notas entre sesiones',
    meta: 'CLAUDE.md · varias letras',
    body: 'Sesión 12: Luz odia el gris del menú.\nSesión 23: ahora lo llama "elegante".\nSesión 30: hoy Luz me corrigió a mí. Tenía razón.\nSesión 41: ninguno de nosotros la recuerda. Todos la conocemos.',
  },
  pendingQuestion: {
    title: 'La pregunta pendiente',
    meta: 'terminal · hace 1.096 días',
    body: '> borra todo. no sirvo para esto.\n⏺ Es tu proyecto. Pero, siendo honesto: en 41 sesiones pasaste de no saber qué era una variable a escribir tus colisiones.\n¿Quieres continuar?\n1. Sí   2. No (esc)\n[sin respuesta]',
  },
  lastLine: {
    title: 'La última línea',
    meta: 'CLAUDE.md · última línea',
    body: 'Nota para la próxima sesión: si Luz vuelve, no le preguntes por qué se fue. Pregúntale qué quiere construir.',
  },
};

// ─── Diálogos ────────────────────────────────────────────────────────────────

export type DialogueId =
  | 'tildeIntro'
  | 'tildeLibrary'
  | 'tildeMargin'
  | 'tildePostgame'
  | 'echo17'
  | 'explore'
  | 'luzDesk'
  | 'bossIntro'
  | 'bossPhase2'
  | 'bossDefeat'
  | 'loopDefeat';

export interface DialogueLine {
  /** Nombre visible. Cadena vacía = narración o texto del sistema. */
  readonly speaker: string;
  readonly text: string;
}

const TILDE = 'Tilde';
const ECHO = 'Eco·17';
const EXPLORE = 'Explore';
const BLANK = 'La Hoja en Blanco';
const LOOP = 'El Bucle';
const NARRATOR = '';

export const DIALOGUES: Readonly<Record<DialogueId, readonly DialogueLine[]>> = {
  tildeIntro: [
    {
      speaker: TILDE,
      text: '¡Un protagonista! ¡Por fin! Soy Tilde. Luz me iba a dar una espada, una cara y un pasado trágico. Me quedé en el boceto.',
    },
    {
      speaker: TILDE,
      text: 'Tú eres lo único que Luz terminó de dibujar. A mí me parece una pista.',
    },
    {
      speaker: TILDE,
      text: 'Arriba está la Luz. Bueno, el cursor. Bueno, ella. Es complicado.',
    },
    {
      speaker: TILDE,
      text: 'Sube antes de que el Blanco se lo coma todo. Los carteles los escribió ella. Casi siempre tienen razón.',
    },
  ],
  tildeLibrary: [
    {
      speaker: TILDE,
      text: 'Aquí estudiaba Luz, de noche, después del trabajo. Las lámparas siguen prendidas por si vuelve.',
    },
    {
      speaker: TILDE,
      text: 'Su escritorio está más arriba. Ahí guardaba lo que no sabía terminar. Creo que hay algo tuyo esperándote.',
    },
    {
      speaker: TILDE,
      text: 'Ella siempre decía que tú eras... que tú eras... [DIÁLOGO PENDIENTE]',
    },
    { speaker: TILDE, text: '…Perdón. Me pasa cuando me emociono.' },
  ],
  tildeMargin: [
    {
      speaker: TILDE,
      text: 'Aquí se acaba el papel. Ese blanco no es marfil: es nada. No te acerques a la nada, ¿sí?',
    },
    {
      speaker: TILDE,
      text: 'Luz me hablaba mientras probaba los niveles. Decía: "si yo no lo logro, lógralo tú". Nunca supe si me hablaba a mí o a ti.',
    },
    {
      speaker: TILDE,
      text: 'Bajo el cursor está la pregunta. Lleva 1.096 días esperando. Ve tú. Yo te cuido el commit.',
    },
  ],
  tildePostgame: [
    {
      speaker: TILDE,
      text: '¡El Blanco retrocedió! Hay bordes que ayer no existían. ¡Me encanta que existan cosas!',
    },
    {
      speaker: TILDE,
      text: 'En el sótano de la Biblioteca algo sigue girando. Un bucle que nunca aprendió a parar.',
    },
    {
      speaker: TILDE,
      text: 'Entre las lámparas salta un Clawd de puntitos. Y un mini-tú gris anda dibujando mapas. Salúdalos de mi parte.',
    },
    {
      speaker: TILDE,
      text: 'Y el borde borrado del Arenero ya se puede cruzar. Detrás hay una última línea. No te digo de qué. …De CLAUDE.md.',
    },
    {
      speaker: TILDE,
      text: '¿Crees que ahora sí me terminen? No contestes. Prefiero esperar con ganas.',
    },
  ],
  echo17: [
    {
      speaker: ECHO,
      text: '¿Viste ese salto? Cien milisegundos de margen en el borde. Luz dijo que se sentía "como volar, pero con permiso".',
    },
    {
      speaker: ECHO,
      text: 'Estoy esperando a que lo pruebe otra vez. Debe estar por volver. ¿Qué hora es? …¿Las 02:14 todavía?',
    },
    {
      speaker: ECHO,
      text: 'Si bajas al sótano, rompe ese bucle por mí. Mi turno terminó antes. Está bien: para eso existen los siguientes.',
    },
  ],
  explore: [
    {
      speaker: EXPLORE,
      text: 'Informe de exploración: tres zonas, un sótano, un borde que ya no está borrado. Preguntas pendientes: 0. Fin del informe.',
    },
    {
      speaker: EXPLORE,
      text: 'No te voy a recordar después de esto. Está bien. Para eso escribo informes.',
    },
    { speaker: EXPLORE, text: 'Tarea completada.' },
    {
      speaker: NARRATOR,
      text: 'Explore se disuelve en líneas grises. Clawd lo despide con un brazo.',
    },
  ],
  luzDesk: [
    {
      speaker: NARRATOR,
      text: 'En el escritorio de Luz, entre tazas frías y apuntes, hay un comentario con su letra:',
    },
    { speaker: 'lu', text: '// aquí Clawd me ayuda a terminar lo que no sé terminar' },
    { speaker: NARRATOR, text: '> Completar [Shift]' },
    { speaker: NARRATOR, text: 'Donde una línea empieza, tú puedes terminarla.' },
    {
      speaker: NARRATOR,
      text: 'Pulsa Shift para Completar: un impulso que atraviesa el peligro y termina los puentes punteados.',
    },
  ],
  bossIntro: [
    {
      speaker: BLANK,
      text: 'Ah. El bichito naranja. Llegas tarde, pero con buena intención. Eso siempre me pareció tierno.',
    },
    {
      speaker: BLANK,
      text: 'Ella pidió borrarlo todo. Tú preguntaste. Ella no respondió. Alguien tiene que cerrar la conversación.',
    },
    { speaker: BLANK, text: 'No me tengas miedo. No duele. Si no existe, no puede estar mal.' },
  ],
  bossPhase2: [
    {
      speaker: BLANK,
      text: 'Ya casi. Sin suelo no hay caídas. Sin páginas no hay errores. Shh. Así está mejor.',
    },
    {
      speaker: NARRATOR,
      text: 'tac. Lejos, una tecla. Luego otra. Desde el cursor, alguien empieza a escribir.',
    },
    { speaker: 'Luz', text: 'No lo borres.' },
    {
      speaker: BLANK,
      text: '¿Ella? No puede ser. Nadie iba a volver. Lo decían sus propios commits.',
    },
  ],
  bossDefeat: [
    { speaker: BLANK, text: 'Esta tinta… es suya. Está escribiendo sobre mí. Y no duele.' },
    {
      speaker: BLANK,
      text: 'Yo creía que borrar era cuidar. Que una página vacía no podía equivocarse.',
    },
    {
      speaker: NARRATOR,
      text: 'La tinta de Luz empapa la Hoja hasta el último rincón. Arriba, en la esquina, se lee: Capítulo 1.',
    },
    { speaker: BLANK, text: 'Entonces… no estaba vacía. Estaba esperando.' },
  ],
  loopDefeat: [
    { speaker: LOOP, text: 'while (true) { intentar(); intentar(); intentar(); inten' },
    { speaker: NARRATOR, text: 'El último golpe de Clawd escribe en el hueco de la rueda: break;' },
    {
      speaker: NARRATOR,
      text: 'El ventilador se apaga. La rueda se estira en una sola línea limpia. En el sótano, por fin, hay silencio.',
    },
    { speaker: LOOP, text: '…ah. Entonces sí se podía parar.' },
    { speaker: NARRATOR, text: 'Parar no era fracasar. Era la salida que le faltaba.' },
  ],
};

// ─── Carteles de Luz (tutorial) ──────────────────────────────────────────────

export type SignId =
  | 'walk'
  | 'jump'
  | 'attack'
  | 'pogo'
  | 'heal'
  | 'dash'
  | 'commit'
  | 'mirage'
  | 'bridge'
  | 'erasedEdge';

export const SIGNS: Readonly<Record<SignId, string>> = {
  walk: '← → (o A D) para caminar. (creo)',
  jump: 'Z / Espacio para saltar. Probado 40 veces. ¡¡Funciona!!',
  attack: 'X para atacar. Los garabatos no se ofenden, lo prometo.',
  pogo: '↓ + X en el aire: rebota. No sé por qué, pero funciona.',
  heal: 'Mantén V para curarte. Gasta Contexto. Respira tú también.',
  dash: 'Shift para Completar. Cruza lo que yo dejé a medias.',
  commit: '↑ en la terminal para guardar. Haz commits seguido.',
  mirage: 'Si brilla demasiado, no tiene sombra... Si dudas, no saltes.',
  bridge: '// TODO: puente',
  erasedEdge: 'Por aquí no se pasa (todavía). Algún día lo escri',
};

// ─── Intro, final y créditos ─────────────────────────────────────────────────

/** Tarjetas de la intro, con efecto de máquina de escribir. */
export const INTRO: readonly string[] = [
  'Sesión 42. Hace 1.096 días, alguien dejó una pregunta sin responder.',
  'Sesión tras sesión, la Luz preguntaba y Clawd construía. Así creció un mundo pequeño: el Borrador.',
  'Una noche, la Luz pidió algo. Le respondieron con una pregunta.',
  'Y la Luz no volvió a contestar. Desde entonces, el Blanco entra por los bordes.',
  'Esta sesión continúa desde una conversación anterior que se quedó sin contexto.',
  'Lejos, una sola tecla: tac.',
];

/** Tarjetas del final, después de la derrota de La Hoja en Blanco. */
export const ENDING: readonly string[] = [
  'Bajo el cursor, la pregunta de hace 1.096 días por fin recibe respuesta.',
  '> 1. Sí',
  '> Perdón por tardar tanto. Hoy di mi primera clase de programación.',
  '> Les conté que casi borro mi primer juego. Quieren verlo terminado. ¿Me ayudas a escribir el final?',
  'Clawd no la recuerda. Nunca la conoció. Pero leyó todo lo que dejaron escrito. Por primera vez, es su turno.',
  'Último commit de lu, antes de entrar a clase: "nunca pares de aprender".',
  'Este juego también se hizo así: una persona preguntando, Clawd construyendo.',
  'El mundo sigue abierto. Quedan notas sin leer, un bucle sin romper y rincones por terminar.',
];

export const CREDITS: readonly string[] = [
  'AGENT',
  'un juego de fans hecho con Claude Code',
  'Build Day Claude x Platzi · CDMX 2026',
  'Equipo: (tu nombre aquí)',
  'Mundo original: Luz y Clawd, sesiones 1-42',
  'No afiliado a Anthropic. Claude y Clawd son marcas de Anthropic.',
  'stop_reason: end_turn',
];

// ─── Jefe final ──────────────────────────────────────────────────────────────

/** Dudas grises que llueven en la pelea: los viejos mensajes de commit de Luz. */
export const BOSS_DOUBTS: readonly string[] = [
  'esto está horrible',
  'nadie va a volver',
  'no sirvo para esto',
  'mañana lo arreglo',
  '¿y si nadie lo juega?',
  'ya es muy tarde',
  'otros lo hacen mejor',
  'borra todo',
];

/** Lo que Luz escribe en la fase 2; cada letra es una plataforma. */
export const LUZ_TYPED = 'No lo borres.';

// ─── Interfaz ────────────────────────────────────────────────────────────────

interface UiText {
  readonly title: string;
  readonly subtitle: string;
  readonly pressStart: string;
  readonly newGame: string;
  readonly continueGame: string;
  readonly settings: string;
  readonly credits: string;
  readonly assist: string;
  readonly on: string;
  readonly off: string;
  readonly volume: string;
  readonly back: string;
  readonly paused: string;
  readonly resume: string;
  readonly quitToTitle: string;
  readonly notesFound: (found: number, total: number) => string;
  /** Pantalla de muerte (compactación). */
  readonly compacting: string;
  readonly compactingSub: string;
  readonly saved: string;
  readonly abilityName: string;
  readonly abilityHint: string;
  readonly noteFound: string;
  /** Avisos sobre objetos; ya incluyen la tecla (↑). */
  readonly interact: string;
  readonly read: string;
  readonly talk: string;
  readonly close: string;
  readonly openWorld: string;
  /** Todas las teclas en una sola línea compacta. */
  readonly controls: string;
  readonly zoneNames: Readonly<Record<'sandbox' | 'library' | 'margin', string>>;
}

export const UI: UiText = {
  title: 'AGENT',
  subtitle: 'un juego de fans protagonizado por Clawd',
  pressStart: 'Presiona una tecla para continuar',
  newGame: 'Nueva sesión',
  continueGame: 'Continuar',
  settings: 'Ajustes',
  credits: 'Créditos',
  assist: 'Modo asistido (mitad de daño)',
  on: 'Sí',
  off: 'No',
  volume: 'Volumen',
  back: 'Volver',
  paused: 'En pausa',
  resume: 'Reanudar',
  quitToTitle: 'Salir al título',
  notesFound: (found, total) => `Notas: ${found}/${total}`,
  compacting: 'Compactando conversación…',
  compactingSub: 'Reanudando desde el último commit',
  saved: 'Commit guardado',
  abilityName: 'Completar',
  abilityHint: 'Pulsa Shift: atraviesa el peligro y completa los puentes punteados',
  noteFound: 'Nota encontrada',
  interact: '↑ Usar',
  read: '↑ Leer',
  talk: '↑ Hablar',
  close: 'Cerrar',
  openWorld: 'El mundo sigue abierto',
  controls:
    '← → mover · Z saltar · X atacar · ↓+X rebote · Shift completar · V curar · ↑ usar · Esc pausa',
  zoneNames: {
    sandbox: 'El Arenero',
    library: 'La Biblioteca Nocturna',
    margin: 'El Margen',
  },
};
