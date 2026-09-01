---
name: tailwind-adoption
description: Adopt Tailwind v4 (and later shadcn) into an app with existing bespoke CSS, incrementally and without visual regressions. Use when introducing Tailwind to a project, migrating custom CSS to utilities, or planning shadcn component adoption.
---

House practice for adopting Tailwind into a codebase that already has a
hand-rolled design system — grown live during the ElectronDB migration
(started v1.11.0+, Tailwind 4.3.3, electron-vite 5). This is a running
log: append lessons as they are earned, keep the voice.

## The posture

Component by component, one validated commit each. The e2e suite and
driver screenshots are the regression net — a styling refactor without
one is a leap of faith; with one it's a staircase. Migration REPLACES
bespoke rules with utilities; it never stacks utilities on top of
legacy rules to out-specificity them.

## Foundations (do once, own commit)

- `npm i -D tailwindcss @tailwindcss/vite`, add `tailwindcss()` to the
  renderer's Vite plugins (electron-vite: the `renderer.plugins` array).
- **Skip Preflight entirely** when the app has its own reset/tokens:

  ```css
  @layer theme, base, components, utilities;
  @import 'tailwindcss/theme.css' layer(theme);
  @import 'tailwindcss/utilities.css' layer(utilities);
  ```

  Omitting `tailwindcss/preflight.css` is the supported v4 way to keep
  Tailwind's global reset from fighting existing styles.
- **Layer precedence gotcha**: unlayered legacy CSS outranks layered
  utilities. That's fine — and it enforces the replace-don't-override
  rule: a utility that "doesn't work" usually means the bespoke rule it
  should have replaced is still alive. Delete the rule, don't `!`.
- **Bridge the tokens** with `@theme` so utilities speak the house
  palette (`--color-accent` → `bg-accent`, `--radius-md` → `rounded-md`).
  v4 prunes theme variables until some utility references them — an
  empty-looking `:root` does not mean the bridge failed; the variable
  materializes with its first use.
- Ship one **canary conversion** in the foundations commit (smallest
  rule in the codebase, e.g. `flex: 1` → `flex-1`) and verify computed
  style in the running app. An unused Tailwind install proves nothing:
  v4 only emits utilities found in source.

## Migration rules (phase 2 — component by component)

- **De-blanket before migrating leaves**: bespoke systems style by
  element-in-context (`.notes button`, `.notes input`). Any element a
  blanket rule touches CANNOT migrate to utilities until the blanket is
  dealt with — unlayered blankets beat layered utilities. First live
  case: IconButton (a button inside .notes) deferred until the button
  de-blanketing commit. Survey blankets up front; they set the order.
- **Migration is an audit**: converting the primitives surfaced that the
  Section primitive had zero consumers (dead since the views took over
  their own headers). Expect to find dead code; delete it in the same
  commit — the migration IS the review.
- **Extend the @theme bridge on demand**, not up front — add tokens when
  the component being migrated needs them (e.g. `--color-fg:
  var(--ev-c-text-1)` via `@theme inline` for runtime-var references).
  Pruning means unused bridge entries are dead weight in the source.
- **Verify with computed styles, not eyeballs**: after converting, read
  back getComputedStyle in the running app and compare to the old rule
  byte for byte (gap "8px 10px", radius "8px", …). Screenshots confirm
  layout; computed styles confirm fidelity.
- Spacing map for a 4px-grid house scale: 4→`1`, 8→`2`, 10→`2.5`,
  12→`3`, 16→`4`, 24→`6`. Odd values stay arbitrary (`text-[13px]`).
- Caller-override pattern survives: a Toolbar consumer's unlayered
  class (.tag-filter gap: 6px) still outranks the primitive's gap-2
  utility — intentional during migration; convert callers later.

- Preserve class names that e2e specs target (`.sidebar-item`,
  `.notes-form`, …) as stable hooks even after their styles move to
  utilities; or migrate specs to data-testid first.
- Convert a component fully in one commit: JSX classes + delete the
  bespoke rules together. Validate: typecheck/lint → full e2e →
  driver screenshot compared against the pre-change screenshot.
- Legacy `:root` tokens retire only when the last rule referencing
  them is gone.

## shadcn (phase 3 — only after the CSS speaks Tailwind)

- shadcn requires Tailwind; adopting it earlier back-doors a styling
  system through a component. Foundations first, always.
- shadcn CLI v4 (March 2026+) ships an MCP server:
  `npx shadcn@latest mcp init --client claude` — needs components.json
  (from `shadcn init`), gives the agent live registry search/view/add.
- Path aliases: prefer `paths`-only tsconfig aliases (no `baseUrl` —
  TypeScript 7 removed it).

## Ecosystem facts worth re-verifying at use time

- Versions when this skill was born: tailwindcss 4.3.3, shadcn CLI
  4.19.1. Check `npm view <pkg> version` — this file ages.
- The cwd gremlin applies to every command above: prefix with
  `cd <repo root> &&`.
