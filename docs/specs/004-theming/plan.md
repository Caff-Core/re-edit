# Themes, motion, and accessibility plan

## Design

Use semantic theme tokens and shared motion variables. Keep committed preferences separate from transient hover state. Use shared components and localized strings for controls and errors.

## Scaffold status

The shadcn scaffold includes a light, dark, and system theme provider. Localization is in place (004.03): English and Simplified Chinese catalogs per module through `@/lib/i18n`, a language setting (System, English, 简体中文) that follows the desktop language by default, and an automated WCAG AA contrast check over every theme's tokens. The theme catalog (System, Default Light, Default Dark, Solarized Light, Solarized Dark), preview on highlight with restore on dismissal, and the None, Subtle, Normal, and Bouncy motion presets are in place (004.05). Presets set `--motion-duration` and `--motion-ease` through `<html data-motion>`; theme changes cross-fade with them through a view transition. The presets also reach the installed surfaces (004.02) through rules keyed to `data-motion` in `src/index.css`, without editing the vendor files: None makes every animation and transition instant and stops loops, Subtle keeps fades but drops zoom and slide, Normal keeps the shipped timing, and Bouncy uses the overshoot easing at 300 ms. Menus in this style do not animate at all (`animate-none!`).

## Verification

Use the criteria in [spec.md](spec.md) and complete the integrated check in [tasks.md](tasks.md) in the packaged Fedora 44 application. Record pass or fail with the tested build and evidence.
