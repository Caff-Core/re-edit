# re-edit

An offline Markdown editor for the Linux desktop. Fedora 44 is the first target.

## Stack

- React 19, Vite, TypeScript
- shadcn/ui (Base UI) with the ReUI registry, Tailwind CSS 4
- Bun for packages and scripts
- Planned: Tauri 2, TanStack Router, CodeMirror 6 (see milestone 000)

## Develop

```bash
bun install
bun run dev
```

Checks run in CI on every pull request:

```bash
bun run lint
bun run typecheck
bun run build
```

## Docs

- [Constitution](docs/.specify/memory/constitution.md)
- Feature specs: [docs/specs](docs/specs), one folder per milestone with `spec.md`, `plan.md`, and `tasks.md`
- UI rules for contributors and agents: [AGENTS.md](AGENTS.md)

## Workflow

- Each task in a `tasks.md` file is a GitHub issue titled `[NNN.NN] Title`, grouped by milestone.
- Branch names follow `type/issue-slug`, for example `feat/12-find-replace`. Types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`.
- Commits follow Conventional Commits. Work merges into `main` through pull requests.

## License

MIT
