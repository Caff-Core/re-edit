# Modern Markdown Editor Constitution

## Local files and recovery

Use Fedora 44 as the first desktop target. Authoring, preview, and export work offline. The current buffer is authoritative until a save succeeds. Preserve edits on cancellation, write failure, and external changes. Native operations stay behind typed service boundaries and user-selected paths.

## Document types

The workspace owns document identity, tab order, shared metadata, and layout. Each document feature owns parsing, editing, rendering, its save strategy, and undo history. Register Markdown in the workspace registry. Prove the final tab contract with a second test document type. Direct PDF export is a Markdown operation, while a future PDF editor belongs in its own feature module.

## Atomic design

Atoms are shared primitives and wrap applicable shadcn/ui and ReUI code. Molecules combine primitives around a single interaction. Organisms assemble sections such as the file tree and tabs. Templates compose layouts and routes assemble pages. Put feature-specific components inside the feature. Shared components use feature-neutral contracts.

## Accessibility and motion

Target Web Content Accessibility Guidelines (WCAG) 2.2 AA. Verify the packaged app by keyboard and screen reader on Fedora 44. Keep focused controls visible and use readable contrast, text labels, and discoverable status. Allow None, Subtle, Normal, and Bouncy. The operating system's reduced-motion preference applies None. Input and focus respond immediately.

## Scope and release evidence

Keep requirement and acceptance identifiers stable. Preserve a feature's spec, plan, and tasks together. Record actual verification separately from planned checks. Cloud sync, version history, and real-time collaboration are deferred. Release requires the five feature milestones and the packaged Fedora acceptance walkthrough.
