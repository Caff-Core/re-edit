# re-edit

An offline Markdown editor for the Linux desktop. Fedora 44 is the first target.

## Stack

- React 19, Vite, TypeScript
- shadcn/ui (Base UI) with the ReUI registry, Tailwind CSS 4
- Bun for packages and scripts
- Vitest, Testing Library, and jsdom for frontend tests (`src/**/*.test.{ts,tsx}`, fixtures in `src/test/fixtures`)
- Tauri 2 desktop shell (Linux first)
- TanStack Router (file routes in `src/routes`, hash history)
- Planned: CodeMirror 6 (see milestone 000)

## Develop

Linux build dependencies (Fedora):

```bash
sudo dnf install webkit2gtk4.1-devel libsoup3-devel javascriptcoregtk4.1-devel librsvg2-devel
```

```bash
bun install
bun tauri dev   # desktop app
bun run dev     # browser only, http://localhost:1420
```

Native operations go through `src/services/native` (TypeScript contract) and `src-tauri/src/native` (Rust commands). In a plain browser a fallback service stands in for the host.

Checks run in CI on every pull request:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

## Docs

- [Constitution](docs/.specify/memory/constitution.md)
- Feature specs: [docs/specs](docs/specs), one folder per milestone with `spec.md`, `plan.md`, and `tasks.md`
- UI rules and project structure for contributors and agents: [AGENTS.md](AGENTS.md)

## Workflow

- Each task in a `tasks.md` file is a GitHub issue titled `[NNN.NN] Title`, grouped by milestone.
- Branch names follow `type/issue-slug`, for example `feat/12-find-replace`. Types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`.
- Commits follow Conventional Commits. Work merges into `main` through pull requests.

## License

MIT
