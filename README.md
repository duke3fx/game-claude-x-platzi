# AGENT

Un juego de fans protagonizado por **Clawd**, hecho con Claude Code para la Build Day **Claude x Platzi**.
Plataformas y acción 2D con alma de metroidvania: unos 3 minutos de historia principal y, después, un mapa abierto para explorar.

> No está afiliado a Anthropic. Claude y Clawd son marcas de Anthropic.

## Desarrollo

Requisitos: Node 24 y pnpm.

```bash
pnpm install
pnpm dev        # servidor de desarrollo
pnpm check      # lint + typecheck + tests + build
```

## Stack

Phaser 4 · Vite 8 · TypeScript 7 (strict) · Biome · Vitest. Todo el arte y el audio se generan por código.
Se despliega como sitio estático en Vercel (`vercel.json`).

El diseño completo está en [`docs/GDD.md`](docs/GDD.md).
