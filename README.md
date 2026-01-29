# Pomodoro

Pomodoro is a focused timer app built with SvelteKit and Vite, with an optional Tauri desktop shell. It helps you run Pomodoro sessions (work and breaks), track your current phase, and manage your flow without leaving the app.

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

## Tauri (optional)

Run the desktop app in dev mode:

```sh
bunx tauri dev
```

Build the desktop app:

```sh
bunx tauri build
```
