# Foodie Swordsman

A pixel browser action game: catch falling food with your sword before it hits the ground. The longer a round lasts, the faster and more often the next bites appear.

Author: [Jakub Stawski](https://github.com/JakubStawski)

## Rules

- You start with **10 lives**. Each piece of food that hits the ground costs one.
- A successful slash is worth **10 points**.
- The round ends when you run out of lives. Your best score is saved in the browser.
- Difficulty ramps over time: food falls faster, spawns more often, and later can appear two at a time.

From the menu you can open **Help** (controls) and **Credits**. Toggle background music with the button in the corner of the screen.

## Controls

| Action | Keys |
| --- | --- |
| Move | `A` / `D` or ← → |
| Catch | `Space` or `Enter` |
| Pause | `Esc` |

On the score screen, `Space` / `Enter` starts a new round and `Esc` returns to the menu.

## Requirements

- [Node.js](https://nodejs.org/) (LTS)
- npm

## Getting started

```bash
npm install
npm start
```

Vite serves the game at `http://localhost:5173`.

Production build:

```bash
npm run build
```

Output goes to `dist/`.

## Stack

- [TypeScript](https://www.typescriptlang.org/)
- [PixiJS](https://pixijs.com/) — 2D rendering, sprites, stage
- [Howler.js](https://howlerjs.com/) — music and SFX
- [Zustand](https://github.com/pmndrs/zustand) — game phases, HP, score
- [Vite](https://vitejs.dev/) — dev server and bundling

## Structure

```
src/
  components/   # character, food, HUD, background, buttons
  containers/   # screens: menu, play, pause, score, help
  config/       # graphics, sounds, difficulty curve
  core/         # Pixi app, loader, audio, screen switching
  store/        # game state
public/         # images, font, audio files
```

## License

ISC
