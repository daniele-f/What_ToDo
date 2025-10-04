# What ToDo — Personal To‑Do Web App (LocalStorage, Daily/Weekly resets)

A tiny, single‑page to‑do app built with plain TypeScript and Vite. It runs entirely in your browser, persists data to `localStorage`, and can be deployed as static files (e.g.,
GitHub Pages). No backend required.

[daniele-f.github.io/What_ToDo](https://daniele-f.github.io/What_ToDo/)

## Features

- Read mode (default):
    - Todos show a checkbox to toggle done state.
    - Headers are larger/bold and have no checkbox.
- Edit mode:
    - Add new items (Header or Todo).
    - Edit any item’s text.
    - Change repeat for todos (none/daily/weekly).
    - Delete items.
    - Insert sample data.
    - Export/Import JSON of your data (local backup/restore).
- Resets:
    - Daily: done todos reset at the start of your local day.
    - Weekly: done todos reset at the start of the current ISO week (Monday 00:00 local).
- Top bar shows “Last edited at dd/MM/yyyy HH:mm (x hours y minutes ago)”. The relative part updates every 60 seconds without storing anything new.
- Multi‑tab aware: changes in another tab trigger a re‑render in the current tab.
- Accessible: keyboard‑navigable controls with aria‑labels, and high‑contrast focus outlines.
- Light/dark via `prefers-color-scheme`.

## Getting Started

Requirements: Node.js 18+ recommended.

Install dependencies:

```
npm i
```

Start the dev server:

```
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

Build for production:

```
npm run build
```

This outputs a static site to the `dist/` directory.

Preview the production build locally:

```
npm run preview
```

## Deploy to GitHub Pages

This project is configured with a relative `base` in `vite.config.ts`, so it works under any repo name on GitHub Pages.

Option A — Push the `dist/` folder to `gh-pages` branch manually:

1. Build: `npm run build` (creates `dist/`).
2. Commit your changes on `main` (includes source files).
3. Create (or update) the `gh-pages` branch with the contents of `dist/`:
    - Using git subtree:
        - `git subtree push --prefix dist origin gh-pages`
    - Or create a separate worktree for `dist/` and push.
4. In your repo settings → Pages, set the source to the `gh-pages` branch.

Option B — Use an action (e.g., `peaceiris/actions-gh-pages`) to publish `dist/` after build.

Once deployed, your site will be available at `https://<username>.github.io/<repo>/`.

## Export/Import JSON

- In Edit mode you’ll see two buttons:
    - Export JSON: downloads `todo-store-v1.json` containing the current store.
    - Import JSON: select a previously exported file to replace the current store.
