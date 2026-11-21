# Foundation plan

## Design

Wrap the Vite and React app in a Tauri 2 shell for Linux. Keep native operations behind a typed service boundary. Route with TanStack Router through a root layout template. Place CodeMirror 6 inside the Markdown feature module. Lay out shared components as atoms, molecules, organisms, and templates per the constitution.

## Scaffold status

The shadcn/ui Vite template is in place with Bun, Tailwind CSS 4, Base UI, and the ReUI registry. All other foundation work is not started.

## Verification

Each task in [tasks.md](tasks.md) states its check. CI runs lint, typecheck, tests, and build for the frontend, and fmt, clippy, and tests for the Tauri crate.
