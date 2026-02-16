# Temporal Interval Protocol (TIP)

Temporal Interval Protocol (TIP) is a focused timer app built with SvelteKit and Vite, with an optional Tauri desktop shell. It helps you run structured work and break sessions, track your current phase, and manage your flow without leaving the app.

# Dev notes

Temporal Interval Protocol (TIP) is a SvelteKit + Vite app with an optional Tauri desktop shell.

Project structure highlights:

- `src/routes/+page.svelte`: main UI and timer logic.
- `src/routes/+layout.svelte`: shared layout and CSS import.
- `src/app.css`: global styles.
- `src/lib/`: shared helpers and assets.
- `static/`: static assets served as-is.
- `src-tauri/`: optional desktop shell (Rust) and Tauri config.

Conventions and workflow:

- Prefer Bun for scripts and installs.
- Use Svelte 5 runes and keep tabs for indentation in `.svelte` files.
- Store settings in `localStorage` with versioned keys (e.g. `pomodoro-settings-v1`).
- When changing the settings shape, keep the key stable and add a small migration so older values are safely upgraded to defaults.
- Wrap `JSON.parse` in `try/catch` and fall back to a safe default object when data is missing or invalid.
- Preserve accessibility details (aria labels, live regions, keyboard shortcuts).

## Settings behavior

Settings are automatically saved when changed. The settings panel opens as an overlay and applies changes immediately:

- Work minutes, break minutes, and iterations save on every input change
- No manual save button is required
- Changes take effect immediately and reset the timer
- Settings persist in localStorage with the key `pomodoro-settings-v1`


# Commands

## Development

Install dependencies:

```sh
bun install
```

Start the dev server:

```sh
bun run dev
```

Open a browser automatically:

```sh
bun run dev -- --open
```

Type-check Svelte/TypeScript:

```sh
bun run check
```

## Build and preview

Build the production bundle:

```sh
bun run build
```

Preview the production build:

```sh
bun run preview
```

## Tests

Run all tests:

```sh
bun run test
```

If you do not have Bun installed:

```sh
npm run test
```

Watch tests:

```sh
bun run test:watch
```

## Visual tests

Install Playwright browsers (once per machine):

```sh
bunx playwright install
```

If you do not have Bun installed:

```sh
npx playwright install
```

Run visual tests:

```sh
bun run test:visual
```

Update visual snapshots:

```sh
bun run test:visual:update
```

If you do not have Bun installed, run:

```sh
npm run test:visual
```

Update visual snapshots without Bun:

```sh
npm run test:visual:update
```

During visual tests, overlays are opened deterministically using dev-only URLs:

```sh
http://127.0.0.1:4173/?visual=settings
http://127.0.0.1:4173/?visual=shortcuts
```

To override the dev server command (for example, to use npm), set:

```sh
PW_SERVER_COMMAND="npm run dev -- --host 127.0.0.1 --port 4173"
```

## Tauri (optional)

Run the desktop app in dev mode:

```sh
bunx tauri dev
```

Build the desktop app:

```sh
bunx tauri build
```

Build for macOS (ARM64):

```sh
bunx tauri build --target aarch64-apple-darwin
```

## Version management

The version number is stored in three files that must be kept in sync:
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Bump version (updates all files):

```sh
bun run version:bump          # bump patch version (0.1.0 -> 0.1.1)
bun run version:bump minor    # bump minor version (0.1.0 -> 0.2.0)
bun run version:bump major    # bump major version (0.1.0 -> 1.0.0)
```

Or use the script directly:

```sh
node bump-version.js [patch|minor|major]
```
