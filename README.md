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

Watch tests:

```sh
bun run test:watch
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
