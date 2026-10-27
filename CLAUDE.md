# BORRADOR: reglas para agentes

- Diseño y alcance: `docs/GDD.md`. El recorrido principal dura ~3 min y luego el mapa queda abierto. No amplíes el alcance sin preguntar.
- Antes de dar algo por terminado: `pnpm check` (Biome + `tsc --noEmit` + Vitest + build) en verde.
- Capas:
  - `src/core`: TypeScript puro y testeable. Prohibido importar Phaser (lo hace cumplir Biome).
  - `src/config`: constantes. Todo número de "feel" va en `config/tuning.ts`.
  - `src/content`: datos (mapa ASCII, textos en español).
  - `src/gfx`, `src/audio`: generación de arte y sonido por código. No hay archivos binarios de assets.
  - `src/entities`, `src/systems`, `src/scenes`: adaptadores de Phaser. Solo las escenas componen sistemas.
- TypeScript: `erasableSyntaxOnly` está activo, así que no uses `enum`, `namespace` ni parameter properties. Usa objetos `as const` y uniones.
- Phaser 4 (no 3): `Scene.update()` lleva `override`; `init`/`preload`/`create` no. FX y máscaras ahora son filtros (`obj.filters.internal/external`). `setTintFill` ya no existe: usa `setTint(c).setTintMode(Phaser.TintModes.FILL)`. Hay guías en `node_modules/phaser/skills/`.
- Marca: Clawd es fiel al original (`#D77757`, ojos `#141414`). No uses el logo de Anthropic ni pongas "Claude" en el nombre del producto. Ningún color de marca significa "enemigo": el peligro es magenta `#FF3EC8`.
- Commits convencionales (`feat:`, `fix:`, `chore:`...).
