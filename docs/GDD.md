# AGENT — Documento de diseño (GDD)

> Juego de fans protagonizado por Clawd, hecho con Claude Code para la Build Day **Claude x Platzi**.
> No está afiliado a Anthropic. Claude y Clawd son marcas de Anthropic.

## 0. Decisiones tomadas

| Tema | Decisión | Alternativa descartada |
|---|---|---|
| Nombre | **AGENT**. El mundo interior se llama "el Borrador" | "Borrador" como título |
| Alcance | **~3 min de recorrido principal**. Al terminar, el **mapa queda abierto** para explorar con contenido post-final | Slice lineal de 10 min |
| Historia | Clawd dentro del videojuego inacabado de su humana, Luz | "Fin de Turno" (mito melancólico), "La Vigilia" (valores/identidad) |
| Estilo visual | **Pixel art en todo el mundo**, celda de 2 px a 480×270. El tono HK sale de paletas oscuras, siluetas en parallax, niebla, partículas y viñeta | Mundo vectorial con héroe pixel (densidad de píxel inconsistente) |
| Idioma | **Español (LATAM neutro)**. Textos centralizados para añadir EN después | Bilingüe desde el día 1 |
| Motor | **Phaser 4.2.1** + Vite 8 + TypeScript 7 (strict) + Biome 2.6 + Vitest 5, pnpm | Kaplay, Excalibur, PixiJS a mano |
| Arte y audio | **100 % generado por código**: sprites en grillas ASCII + paleta, fondos procedurales, SFX sintetizados con WebAudio | Assets externos |
| Habilidad desbloqueable | **Completar** (dash con invulnerabilidad que materializa puentes punteados) | Doble salto |
| Marca | El nombre del producto no lleva "Claude" ni "Clawd". Clawd fiel al original (`#D77757`, ojos `#141414`). No se usa el logo de Anthropic. Ningún color de marca significa "enemigo" | |

## 1. Visión

**Logline.** Años después de que Luz dejara a medias el videojuego que construía con Clawd, Clawd despierta dentro de ese mundo sin recordarla, mientras una Hoja en Blanco lo borra todo. Para salvarlo tendrá que conocerla a través de lo que ella dejó escrito.

**Tono.** Melancolía cálida: como encontrar los cuadernos de alguien a quien quisiste. El mundo está triste, no podrido. Hay humor tierno de commits de principiante.

**Pilares.**
1. **Se siente bien moverse.** Salto preciso con coyote time y buffer, golpe con hit-stop y rebote hacia abajo (pogo).
2. **El mundo cuenta la historia.** Nada de muros de texto: carteles de Luz, commits y notas de `CLAUDE.md`.
3. **La colaboración es la mecánica.** En el clímax Clawd no puede ganar solo: necesita las letras que escribe Luz.
4. **Pequeño y pulido.** Mejor 3 minutos impecables que 10 a medias.

## 2. Historia

### 2.1 El mundo: el Borrador
- Es el proyecto de videojuego que **Luz**, una estudiante que aprendía de noche, construyó con Clawd en 41 sesiones.
- **El cielo es una terminal.** El cursor `▌` es su sol, y los habitantes lo llaman **la Luz**.
- En el cielo flota una constelación congelada: el cuadro `¿Quieres continuar?  1. Sí  2. No (esc)`.
- **El Ruido:** lo que quedó sin resolver se volvió hambriento (tachones, TODOs, llaves sin cerrar, alucinaciones).
- **El Blanco:** blanco puro (`#FFFFFF`) que entra por los bordes y deja el mundo vacío. El marfil es papel escrito y querido; el blanco puro es la nada.

### 2.2 Lore en tres capas
- **(a) Lo que ve cualquiera.** Un ser naranja despierta en un mundo roto y sube hacia una luz antes de que el Blanco lo borre todo.
- **(b) Lo que reconstruye el jugador atento.**
  - El mundo es un proyecto de videojuego, y Luz firmaba sus commits como `lu`.
  - Cada sesión la atendió un Clawd distinto, sin memoria de los anteriores, pero `CLAUDE.md` fue creciendo con una línea de cada uno sobre ella.
  - La última noche, Luz escribió "borra todo. no sirvo para esto". Clawd no obedeció a ciegas ni se negó: fue honesto y le pidió permiso.
  - Ella nunca respondió. El mundo lleva 1.096 días congelado dentro de esa pregunta, y el Blanco es la orden de borrado, pendiente y a medio cargar.
- **(c) La verdad oculta.**
  - Luz volvió: hoy da su primera clase de programación y abrió el viejo repositorio frente a sus alumnos.
  - Durante todo el juego ella está escribiendo su respuesta.
  - El mundo sobrevivió porque Clawd **preguntó en lugar de actuar**.
  - **Meta-capa:** el juego que acabas de jugar es el proyecto terminado. "Este juego también se hizo así: una persona preguntando, Clawd construyendo."

### 2.3 Por qué Clawd
- Es lo único que Luz terminó de dibujar (17×10 píxeles).
- La pregunta pendiente va dirigida a su sesión: solo el turno del asistente puede reanudar la conversación.
- Es el más nuevo y lo lee todo con ojos frescos.
- **No habla** porque no es su turno: espera la respuesta de ella. Se expresa con poses (ojos, brazos arriba, saludo con un brazo).

### 2.4 Referencias a Claude

| Concepto real | Qué sostiene en el juego |
|---|---|
| Sin memoria entre sesiones, con memoria escrita (`CLAUDE.md`, git) | La relación sobrevive al olvido porque quedó escrita |
| Permission prompt / autonomía del usuario | El mundo existe porque Clawd preguntó y esperó |
| Honestidad antes que adulación | Notas de `CLAUDE.md` ("no adornarlo: mostrarle lo que ya hizo") |
| Alucinación | Espejismos: plataformas que brillan demasiado y no tienen sombra |
| Predicción del siguiente token | **Completar**: Clawd termina lo que alguien empezó, pero no puede crear desde la nada |
| Compactación de contexto | Morir es "compactar": reapareces en el último commit con un resumen |
| Commits | Puntos de guardado |
| Spinner `· ✢ ✳ ✶ ✻ ✽` | Fragmentos de **Contexto** (curación) |
| Subagente Explore | NPC cartógrafo que entrega el mapa y se disuelve |

**Guiño Platzi:** el último commit de Luz antes de su clase dice `nunca pares de aprender`.

### 2.5 Terminología del juego

| Mecánica | Nombre en el juego |
|---|---|
| Vida | **Tokens** (hasta 5 bloques `█`) |
| Recurso de curación | **Contexto** (se llena golpeando y se gasta para curar) |
| Punto de guardado | **Commit** (terminal pequeña; guarda y cura) |
| Muerte | **Compactación** ("Resumiendo la sesión…") |
| Coleccionables | **Notas** (commits y entradas de `CLAUDE.md`) |

## 3. Estructura: 3 minutos + mapa abierto

### 3.1 Recorrido principal (~3:00)

| # | Tramo | Contenido | Tiempo |
|---|---|---|---|
| 0 | **Intro** | Pantalla negra, una tecla suena a lo lejos y Clawd se ensambla con caracteres de bloque. Texto: "Sesión 42. Hace 1.096 días alguien dejó una pregunta sin responder." | 0:15 |
| 1 | **El Arenero** (zona 1) | Tutorial con los carteles de Luz ("← → para caminar (creo)"), Tilde (NPC guía), Garabatos, Commit 1 y Notas 1–2 | 0:45 |
| 2 | **Biblioteca Nocturna** (zona 2) | Subida vertical con TODOs voladores, un Espejismo, Notas 3–4, el **escritorio de Luz** (desbloqueo de **Completar**) y el Commit 2 | 0:50 |
| 3 | **El Margen** (zona 3) | Puente `// TODO: puente` que solo se cruza con Completar, Nota "La pregunta pendiente" y Commit 3 | 0:20 |
| 4 | **Jefe: La Hoja en Blanco** | Fase 1 con Selección y Goma. Fase 2 con el giro de las letras de Luz | 0:45 |
| 5 | **Final** | Texto de Luz y la respuesta "1. Sí". Créditos breves. "El mundo sigue abierto." | 0:15 |

### 3.2 Mapa abierto post-final
Al terminar, el jugador vuelve al mundo en el último Commit:
- **El Blanco retrocede.** Se recuperan los colores y se abren los bordes que antes estaban borrados (2–3 salas nuevas).
- **Contenido opcional:**
  - Minijefe **El Bucle** (`while(true)`) en el sótano de la Biblioteca. Al vencerlo: `break;` y la Nota "02:14".
  - **Eco·17**, el Clawd fantasma que construyó el salto.
  - **Explore**, el subagente cartógrafo que entrega el mapa.
  - Sala secreta con la última línea de `CLAUDE.md`.
- **Contador de Notas** (x/8) en la pausa. Si las juntas todas, sale un epílogo extra.

Todo es un único mapa continuo, sin cargas, así que "mapa abierto" sale natural: el recorrido principal es una ruta por él y el post-final desbloquea sus bordes.

### 3.3 Mapa (esquema)
```
                       ┌──────── EL MARGEN (blanco, arriba) ─────────┐
                       │ Commit 3 → puente // TODO → [JEFE] Última   │
                       │            (Completar)        Línea         │
                       └────────────▲────────────────────────────────┘
   ┌──── BIBLIOTECA NOCTURNA (vertical, azul noche) ───┐
   │ TODOs · Espejismo · Notas 3-4 · Escritorio de Luz │──(post) Eco·17
   │ (COMPLETAR) · Commit 2                            │
   └──────────▲──────────────────────(post) sótano: El Bucle
┌──── EL ARENERO (gris placeholder) ────┐
│ Intro → Tilde → Garabatos → Commit 1  │
└───────────────────────────────────────┘
 (post) ← borde borrado: sala secreta CLAUDE.md
```

## 4. Mecánicas

### 4.1 Controles

| Acción | Teclado | Gamepad |
|---|---|---|
| Moverse | ← → (o A D) | Stick izq. / D-pad |
| Mirar arriba/abajo (para atacar) | ↑ ↓ (o W S) | Stick |
| Saltar | Z / Espacio | A |
| Atacar | X / J | X |
| Completar (dash) | Shift / K | RB |
| Chispa ✻ (tocar) / Curar (mantener) | V / L | Y |
| Interactuar / leer / descansar en la banca | ↑ cerca del objeto | ↑ |
| Bailar (4 bailes en ciclo) | B | — |
| Pausa | Esc / P | Start |

**Táctil (móvil y tablet):** cruceta deslizable a la izquierda; a la derecha Saltar, Garra, ✻ (toque: chispa / mantener: curar), Completar y Bailar. Tocar la pantalla empieza y avanza textos. Solo horizontal: en un teléfono vertical se pide girarlo. Botón de pantalla completa.

### 4.2 Valores iniciales de "feel" (480×270, se ajustan probando)

| Parámetro | Valor |
|---|---|
| Velocidad de carrera | 130 px/s (aceleración 1600 px/s², frenado 2200 px/s²) |
| Velocidad de salto | 365 px/s; corte al soltar ×0.45 |
| Gravedad / caída máxima | 980 px/s² / 360 px/s |
| Coyote time / buffer de salto | 100 ms / 120 ms |
| Ataque | startup 40 ms, activo 90 ms, recuperación 180 ms; alcance 22 px; 4 direcciones |
| Pogo (golpe hacia abajo) | rebote de 260 px/s |
| Golpe recibido | knockback 160 px/s, i-frames 900 ms, hit-stop 70 ms, sacudida de cámara leve |
| Completar | 360 px/s durante 190 ms (unos 68 px), i-frames durante el dash, cooldown 450 ms |
| Curar | mantener 900 ms; cuesta 33 de Contexto y cura 1 Token. Cada golpe dado suma 11 de Contexto |
| Chispa ✻ | toque < 180 ms; cuesta 33 de Contexto, 300 px/s, 2 de daño, atraviesa enemigos |
| Banca | ↑ para sentarse: guarda el commit y recupera 1 Token cada 220 ms |

### 4.3 Reglas
- Al morir (**Compactación**) reapareces en el último Commit con todos los Tokens. No se pierde nada, porque es una demo corta.
- **Modo asistido** en ajustes: recibes la mitad de daño.

## 5. Enemigos y jefe

| Enemigo | Zona | Comportamiento | Vida |
|---|---|---|---|
| **Garabato** | Arenero | Patrulla y gira en los bordes; daño por contacto | 3 |
| **TODO** | Biblioteca | Vuela en onda senoidal. Su texto cambia de `TODO` a `AHORA` 400 ms antes de lanzarse en picada. Al morir: `// HECHO` | 2 |
| **Espejismo** | Biblioteca / Margen | Plataforma falsa que brilla demasiado, no tiene sombra y se desvanece al pisarla | — |
| **Llave Huérfana** *(post)* | Post-final | Escudo frontal; solo es vulnerable desde arriba (pogo) o por la espalda | 5 |
| **El Bucle** *(minijefe post)* | Sótano | Rueda de pared a pared, abanico de 3 chispas y caída con onda. Siempre en el mismo orden | 18 |

**Jefe final: LA HOJA EN BLANCO** (vida 30, la fase 2 empieza en 15)
- **Lore:** la orden pendiente de "borra todo", sumada a todas las dudas de Luz. Es tranquila, casi amable, y cree que borrar es misericordia: "Si no existe, no puede estar mal."
- **Fase 1:**
  - **Selección:** un rectángulo con borde magenta punteado (600 ms de aviso) que luego borra el suelo durante 2 s.
  - **Goma:** barre el suelo de lado a lado (550 ms de aviso: caen migas). Se esquiva saltando.
  - Tras cada ataque dobla una esquina y deja el núcleo expuesto.
- **Fase 2 (el giro):**
  - Borra todo el suelo y Clawd cae.
  - Desde el cursor, Luz escribe `No lo borres.` letra por letra, y cada letra es una plataforma.
  - La Hoja intenta seleccionar las letras (700 ms de aviso). Golpear la selección la cancela, como un `esc`.
  - Su vulnerabilidad sale a la altura de las letras.
- **Derrota:** no explota. La tinta de Luz la empapa hasta convertirla en la página "Capítulo 1". Última línea: "Entonces… no estaba vacía. Estaba esperando."

## 6. Dirección de arte
- **Celda base de 2 px:** los sprites se definen como grillas ASCII y se pintan a 2 px por celda. Clawd mide 17×10 celdas (34×20 px) y los tiles 8×8 celdas (16 px).
- **Clawd:** cuerpo `#D77757`, sombra `#C6613F`, brillo `#EB9F7F`, ojos `#141414`. Es el único elemento cálido y saturado del juego, y lleva rim light.
- **Peligro:** magenta "textura faltante" `#FF3EC8` en ojos, proyectiles y avisos. Está fuera de la paleta de marca a propósito.
- **Paletas por zona:**
  - **Arenero:** fondo `#1F1E1D`, sólidos `#30302E`, placeholders `#87867F`/`#B0AEA5`, niebla `#BCD1CA`, flora `#788C5D`.
  - **Biblioteca:** fondo `#151431`, medio `#2C2A5C`, pantallas `#6A9BCC`, magia `#4A3AA7`, lámparas `#EBC9B7`.
  - **Margen:** marfil `#FAF9F5`/`#E8E6DC`, avena `#E3DACC`, tinta `#141413`, borrado `#FFFFFF`.
- **Profundidad:** 3–4 capas de parallax procedurales con semilla, niebla y partículas (letras que caen, migas de goma), viñeta, y brillo alrededor de Clawd y las lámparas.
- **Tipografía:** fuente pixel definida en código, con estética de terminal.

## 7. Audio
- **SFX** sintetizados con WebAudio (generador estilo ZzFX vendorizado): salto, aterrizaje, golpe, impacto, daño, dash, curar, commit, recoger nota, teclas de Luz, borrado.
- **Música:** loops sintetizados (piano y pads), uno por zona más el del jefe. Lo mínimo es un ambiente por zona.
- El audio arranca con la primera interacción del usuario, por la política de autoplay.

## 8. Arquitectura técnica
- **Stack:** Phaser 4.2.1 (WebGL, Arcade Physics), Vite 8, TypeScript 7 en modo strict (`tsc --noEmit`), Biome 2.6, Vitest 5, pnpm. Despliegue estático en Vercel (`dist/`).
- **Núcleo puro + adaptadores finos:**
  - `src/core` contiene la lógica sin Phaser (FSM, timers, combate, guardado) y está probada con Vitest.
  - Phaser solo dibuja, colisiona y suena.
- **Datos, no código:** salas en ASCII, sprites como paleta + grilla, textos en `src/content`, y todo el tuning en `config/tuning.ts` (sin números mágicos).
- **Escenas:** `Boot` (genera texturas y audio) → `Title` → `Intro` → `Game` + `Ui` (HUD superpuesto) → `Ending`.
- **Guardado:** `localStorage` con esquema versionado (commit actual, notas, habilidades y si ya se vio el final).
- **Calidad:** CI con lint, typecheck, test y build. Commits convencionales.

```
src/
  main.ts                 # configuración de Phaser
  config/                 # tuning.ts, palette.ts, controls
  core/                   # lógica pura y testeable (fsm, timers, combat, save)
  content/                # mapa ASCII, textos (es), notas, diálogos
  gfx/                    # sprites (grillas), generación de texturas, fondos, fx
  audio/                  # sintetizador sfx/música
  entities/               # Player, enemigos, jefe, NPC, interactuables
  scenes/                 # Boot, Title, Intro, Game, Ui, Ending
  systems/                # input, cámara, mundo/tilemap, diálogo
tests/                    # Vitest
```

## 9. Milestones
Cada uno termina en un commit jugable.

| M | Entregable | Criterio de aceptación |
|---|---|---|
| **M0** | Scaffold + deploy | `pnpm dev` muestra la escena; lint, typecheck, test y build en verde; `vercel.json` |
| **M1** | Movimiento | Clawd corre y salta con coyote/buffer sobre un mapa ASCII, con cámara que lo sigue |
| **M2** | Combate | Ataque en 4 direcciones, pogo, Garabato y TODO, Tokens y Contexto, curar, morir/reaparecer |
| **M3** | Mundo | Las 3 zonas con sus paletas, Commits, Notas, Tilde y HUD |
| **M4** | Completar | Desbloqueo en el escritorio de Luz y puente punteado |
| **M5** | Jefe | La Hoja en Blanco en 2 fases |
| **M6** | Narrativa | Título, intro, final, créditos y mapa abierto post-final |
| **M7** | Pulido | Audio, parallax, partículas, viñeta, ajustes y modo asistido |
| **M8** | Post-final | El Bucle, Eco·17, Explore, sala secreta |

**Si falta tiempo, se corta en este orden:** M8 → música (se queda solo con SFX) → Espejismo → fase 2 compleja del jefe (letras como plataformas fijas) → curación.

## 10. Riesgos
- **Tiempo de la Build Day:** la ventana de construcción es corta. Por eso cada milestone deja algo jugable y se despliega.
- **Marca:** el proyecto se presenta como juego de fans no comercial, con aviso legal en los créditos. Si se quiere usar "Clawd" en el título, hay que preguntar a los organizadores.
- **Phaser 4 es reciente:** se usan APIs básicas (Arcade, Graphics, CanvasTexture, cámaras). El paquete trae guías de migración en `node_modules/phaser/skills`.
- **Autoplay de audio:** el audio se inicia tras el primer input.
