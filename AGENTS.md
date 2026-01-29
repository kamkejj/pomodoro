# AGENTS

Guidance for coding agents working in this repository.

## Project snapshot
- App: SvelteKit + Vite frontend with optional Tauri shell.
- Language: TypeScript in `src/`, Rust in `src-tauri/`.
- Styling: CSS in `src/app.css`.
- Package manager: Bun is present (`bun.lock`), npm also works.

## Commands
Use Bun unless you need npm.

### Frontend
- Install deps: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Preview: `bun run preview`
- Type check (Svelte): `bun run check`
- Type check (watch): `bun run check:watch`

### Tauri (optional)
- Tauri CLI is available via dev dependency.
- Dev app: `bunx tauri dev`
- Build app: `bunx tauri build`
- Rust tests: `cargo test` (run in `src-tauri/`)

### Tests
- JS test runner: Vitest.
- Install deps: `bun install`.
- Run all tests: `bun run test`.
- Watch mode: `bun run test:watch`.

### Single test (current state)
- Run a single test file: `bun run test -- src/lib/pomodoro.test.ts`.
- For Rust, run a single test with `cargo test <test_name>`.

## Code style
Follow existing patterns in `src/routes/+page.svelte` and config files.

### General
- Prefer small, pure functions with early returns.
- Use descriptive names; avoid single-letter names outside small loops.
- Keep side effects isolated and explicit.
- Use `const` by default; `let` only when reassigned.
- Keep modules focused; avoid dumping unrelated helpers into one file.

### Imports
- Order: external packages, `$lib` aliases, then relative imports.
- Use single quotes for strings (matches existing code).
- Prefer named imports; avoid `import * as` unless required.
- Place side-effect imports (like CSS) after value imports.

### TypeScript
- `strict` is enabled; keep types explicit at boundaries.
- Prefer union types and type narrowing over `any`.
- Use `type` for object shapes; `interface` only when extending.
- Keep types near usage; avoid global type sprawl.
- Use `ReturnType<typeof fn>` for timer/interval IDs.

### Svelte (SvelteKit 5)
- Use Svelte 5 runes (`$props`, `$state`, `$derived`) where applicable.
- Keep `<script lang="ts">` at top of component.
- Prefer reactive declarations (`$:`) for derived values.
- Avoid manual DOM access unless needed; prefer bindings and props.
- Maintain accessible markup: labels, `aria-*`, keyboard shortcuts.

### State and side effects
- Initialize client-only features inside `onMount`.
- Guard for browser APIs with `typeof window !== 'undefined'`.
- Always clean up in `onDestroy` (intervals, listeners).
- Avoid long-lived globals; keep state in component scope.

### Error handling
- Wrap `JSON.parse` and other unsafe calls in `try/catch`.
- On failure, return safe defaults rather than throwing.
- For permission flows, update user-facing status text.
- Avoid silent failures unless a safe default is obvious.

### Naming
- Components: `PascalCase`.
- Variables/functions: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for module-level constants.
- Event handlers: `handleX`, `onX`, or verb-based names.
- Derived labels: suffix with `Label` or `Text` when user-facing.

### Formatting
- Indentation uses tabs in Svelte/TS files; keep this consistent.
- One expression per line for ternaries in templates (see `+page.svelte`).
- Keep JSX-like markup aligned; avoid deep nesting where possible.
- Use trailing commas in multi-line objects and arrays.

### CSS
- Keep class names semantic and UI-focused.
- Use utility-like classes only when consistent with existing styles.
- Prefer `rem` for spacing/typography; use `px` for borders.
- Keep layout rules near the component they style.

### Rust (Tauri)
- Format with `cargo fmt` (default rustfmt rules).
- Prefer `Result` + `?` for fallible calls.
- Avoid `unwrap`/`expect` except at process startup.
- Keep Tauri setup minimal; add plugins in `src-tauri/src/lib.rs`.

## Repo structure
- `src/routes/+page.svelte` is the main UI.
- `src/routes/+layout.svelte` handles shared layout and CSS import.
- `src-tauri/` contains the desktop shell (Rust).
- Static assets live under `src/lib/assets/` and `static/`.

## Data persistence
- Settings and preferences are stored in `localStorage`.
- Keys are versioned (e.g., `pomodoro-settings-v1`).
- When changing storage shape, add a migration and keep the key stable.

## Accessibility
- Keep `aria-live` regions for announcements.
- Ensure buttons have `aria-label` when only icon/stub is shown.
- Maintain keyboard shortcuts (`Space`, `R`, `S`) in timer UI.

## Performance
- Avoid tight loops; use `setInterval` with coarse ticks.
- Use `requestAnimationFrame` only for animation-specific needs.
- Avoid unnecessary reactive updates in Svelte.

## Testing expectations
- No JS test framework is configured in this repo.
- If you add one, include: install steps, test command, single-test command.
- Keep tests close to source (`src/` or `src/lib/`) unless otherwise agreed.

## Linting/formatting
- No ESLint/Prettier config present; follow existing formatting.
- If you introduce a formatter, ensure it preserves tabs in `.svelte`.

## Commits
- Use Conventional Commits format: https://www.conventionalcommits.org/en/v1.0.0/
- Format: `type(scope): description` (scope optional)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Use the imperative mood and keep summaries under ~72 chars when possible.
- Add `!` for breaking changes; describe them in the body if needed.
- Examples:
  - `feat(timer): add long-break schedule`
  - `fix(settings): persist notification toggle`
  - `chore: update dependencies`

## Cursor/Copilot rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.
- If you add any, update this section with the key constraints.

## When adding new files
- Keep exports in `src/lib/index.ts` if you add reusable modules.
- Update `README.md` only for user-facing changes.
- Prefer colocating new CSS with components where feasible.

## Safe defaults for agents
- Assume Bun for scripts and installs.
- Avoid running destructive git commands.
- Do not add new dependencies without clear need.
- Keep Tauri app behavior unchanged unless requested.

## Contact points
- Primary UI: `src/routes/+page.svelte`.
- Entry layout: `src/routes/+layout.svelte`.
- Tauri entry: `src-tauri/src/lib.rs`.
- Tauri binary: `src-tauri/src/main.rs`.
