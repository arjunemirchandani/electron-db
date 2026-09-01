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
- **Layer your own reset, or it eats every utility**: an app's existing
  reset (`* { font-weight: normal }` and friends) is unlayered, and an
  unlayered `*` rule at zero specificity still beats every layered rule.
  Old blanket classes won by specificity; migrated recipes lose by
  layer. Fix: `@import './base.css' layer(base);` — layered author CSS
  still outranks user-agent defaults, so all resets keep working while
  components/utilities finally outrank them. Found via a font-weight
  600 silently rendering 400.
- **De-blanketing recipe**: replace `.notes button`-style element
  blankets with an opt-in `.btn` class in `@layer components` (so
  utilities can override it). Then audit every specialist that
  coexisted with the blanket for silently-inherited properties
  (cursor, font-weight, border) and re-declare them; and strip the
  `!important`s whose only purpose was beating the blanket.
- **The theme bridge changes what utility names mean**: after mapping
  `--radius-lg: 12px`, `rounded-lg` is 12px in THIS app — not
  Tailwind's default 8px. Pick utilities against the bridge, not from
  memory of the default scale. (Bitten once: an icon button grew 4px of
  radius.)
- **State styling moves from specificity to conditionals**: active/
  collapsed variants become React ternaries; specificity hacks (the
  `button.class-active` prefix trick) die with the CSS. Media-query
  behavior becomes responsive variants (`max-[520px]:w-[52px]`).
- **Same-property utilities must live in exclusive branches**: when two
  utilities target one property (bg-transparent in a shared base +
  bg-accent/[0.16] in an active branch), STYLESHEET order decides, not
  class-list order — the shared one can silently win. Put the property
  only in the branches, never in the shared base.
- **Disable transitions before measuring**: in occluded/automated
  windows the animation clock freezes, so a transitioning property
  reads mid-flight values (a width transition frozen at 175px looks
  exactly like a failed utility). el.style.transition='none' first,
  then getComputedStyle. Chased twice; expensive both times.
- **Container queries migrate to @max-[N]: variants** (with a
  `@container` class replacing container-type on the ancestor) — but a
  container/media variant of a property CONFLICTS with its own base
  utility, and the variant can sort earlier and lose (opacity-70 beat
  @max-[520px]:opacity-100). Exclusive branches can't help — container
  state isn't visible to JS — so this is the one legitimate use of the
  per-utility important marker: `@max-[520px]:opacity-100!`.
- **Old compact blocks are mostly duplicates**: a bespoke @container
  block often re-declares base rules wholesale; diff it against the
  base before converting — usually only 3-4 declarations are real
  responsive differences.
- **When a spec breaks, restore the hook, not the spec**: dropping
  .note-content for pure utilities broke search.spec — the class went
  back as a bare hook beside the utilities. Specs are the contract.
- Spacing map for a 4px-grid house scale: 4→`1`, 8→`2`, 10→`2.5`,
  12→`3`, 16→`4`, 24→`6`. Odd values stay arbitrary (`text-[13px]`).
- **A primitive's base classes are promises**: only put a property in a
  shared primitive's base if callers never override it (Toolbar's gap-2
  default was overridden by every caller — it moved to the callers).
  Same-property conflicts between base and caller resolve by stylesheet
  order, which is luck, not design.
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

## Phase 2 complete — what the endgame looks like

ElectronDB's phase 2 landed as 12 commits (foundations → primitives →
de-blanket → sidebar → settings → backups → tags → notes A/B/C →
chrome → token retirement): main.css 1,100 → 230 lines, zero visual
regressions, every commit green on 3-OS CI. The permanent CSS floor —
what SHOULD stay CSS: document-level rules (body/code/#root),
platform rules (Electron titlebar drag regions), focus-visible
blankets, recipe classes (@layer components .btn family), and
keyframe animations. Retire legacy :root tokens only at the very end,
with a grep assert that zero var(--legacy) references remain.

## shadcn (phase 3 — only after the CSS speaks Tailwind)

- shadcn requires Tailwind; adopting it earlier back-doors a styling
  system through a component. Foundations first, always.
- **Nonstandard layout? Reference-init in a scratch dir**: `shadcn init`
  writes where it thinks a Vite app lives. Generate its artifacts in a
  throwaway vite project (`init -t vite -b base -y -p vega` — the -p
  preset flag avoids the interactive theme picker), then port
  components.json/utils/css by hand with your real paths and aliases.
- **The CLI resolves aliases from the ROOT tsconfig**: a solution-style
  workspace (electron-vite) needs the paths duplicated into the root
  tsconfig.json — inert for builds, required for `shadcn add`/`mcp`.
  Paths-only, no baseUrl (TypeScript 7 removed it).
- **Adopt their semantic color contract, not their scales**: map
  --background/--popover/--ring/… onto the house palette (single-theme
  app → values on :root, skip the .dark variant), and deliberately skip
  their --radius calc() mapping or it bulldozes the house radius scale.
- **No-Preflight has one real cost with vendored components**: they
  assume Preflight's form resets, so buttons render with the UA's
  default face (rgb(239,239,239) — looks like a broken theme). Fix once
  with a Preflight-subset shim in layer(base): button/input/select/
  textarea get font:inherit, color:inherit, background transparent.
- **Vendored code keeps upstream style**: exempt components/ui/** from
  house-specific lint rules (return types, only-export-components) so
  files stay diffable against the registry. Inject spec hooks (a bare
  class in the root cn()) instead of rewriting markup — an existing
  spec passing unchanged across the implementation swap is the proof.
- **Wrap the manager in the old facade**: keep the house useToast(msg)
  signature calling manager.add({title, type:'success'}) — consumers
  and specs never notice the engine swap.
- shadcn CLI v4 ships an MCP server: `npx shadcn@latest mcp init
  --client claude` writes .mcp.json (tools load at next session start);
  registry tools need components.json.
- v4-era deps: @base-ui/react (renamed), plus `shadcn` itself for its
  runtime tailwind.css (keyframes, no reset).
- **Scripted-edit safety, the hard way**: `open(path, 'w')` truncates
  the instant it opens — a bug between open and write destroys the
  file (SKILL.md itself was emptied by a stray trailing comma and the
  wreckage committed before anyone noticed). Prefer the harness Edit
  tool for prose files; in scripts, build the full string first and
  write only as the final act.

## Ecosystem facts worth re-verifying at use time

- Versions when this skill was born: tailwindcss 4.3.3, shadcn CLI
  4.19.1. Check `npm view <pkg> version` — this file ages.
- The cwd gremlin applies to every command above: prefix with
  `cd <repo root> &&`.
