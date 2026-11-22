# re-edit

An offline Markdown editor for the Linux desktop. Fedora 44 is the first target.

## Stack

- React 19, Vite, TypeScript
- shadcn/ui (Base UI) with the ReUI registry, Tailwind CSS 4
- Bun for packages and scripts
- Vitest, Testing Library, and jsdom for frontend tests (`src/**/*.test.{ts,tsx}`, fixtures in `src/test/fixtures`)
- Tauri 2 desktop shell (Linux first)
- TanStack Router (file routes in `src/routes`, hash history)
- File access through native dialogs, limited to the files and folders you pick; tabs, folder tree, recents, draft recovery, and optional auto save
- CodeMirror 6 Markdown editor in `src/features/markdown`
- Interface size setting (100% to 150%, Ctrl+= / Ctrl+- / Ctrl+0)
- Themes (System, Default Light and Dark, Solarized Light and Dark) with preview, and None, Subtle, Normal, and Bouncy motion presets
- Export to standalone HTML and to PDF (PDF uses Chromium, which the RPM recommends; without it: `sudo dnf install chromium`)
- English and Simplified Chinese interface (`src/lib/i18n`); the language follows the desktop unless set in Settings

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

## Package

```bash
bun tauri build --bundles rpm
sudo dnf install ./src-tauri/target/release/bundle/rpm/re-edit-*.x86_64.rpm
```

The `Package` workflow builds the RPM in a `fedora:44` container on every push to `main` and on pull requests that touch packaging, installs it, and uploads it as the `re-edit-fedora44-rpm` artifact.

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
