---
name: run-electrondb
description: Build, run, and drive the ElectronDB desktop app. Use when asked to start the app, take a screenshot of it, verify a change works in the running app, or interact with its UI.
---

ElectronDB is an Electron desktop app (electron-vite + React + better-sqlite3 + Drizzle). For agent/automated use, drive it via the Playwright REPL at `.claude/skills/run-electrondb/driver.mjs`. All paths are relative to the project root.

## Build (required before launching)

```bash
npm install        # postinstall rebuilds better-sqlite3 for Electron's ABI
npm run build      # produces out/ — the driver launches this
```

The driver refuses to launch if `out/main/index.js` is missing. Rebuild after any source change; the driver runs the built output, not a dev server.

## Run (agent path)

```bash
node .claude/skills/run-electrondb/driver.mjs
```

By default `launch` uses a **sandbox**: a throwaway userData dir, deleted on quit — safe to create/delete notes freely. `launch real` uses the user's real profile and database; don't mutate data in that mode without being asked to.

Piped one-shot (fine for quick checks; commands run strictly in order):

```bash
printf 'launch\nadd-note Demo :: hello\nnotes\nss demo\nquit\n' | node .claude/skills/run-electrondb/driver.mjs
```

Interactive via tmux, for longer sessions where the app should stay up between commands (note: tmux is NOT installed on the primary dev Mac — use piped one-shots there, or `brew install tmux` first):

```bash
tmux new-session -d -s edb -x 200 -y 50
tmux send-keys -t edb 'node .claude/skills/run-electrondb/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t edb -p | grep -q "driver>"; do sleep 0.2; done'
tmux send-keys -t edb 'launch' Enter
timeout 60 bash -c 'until tmux capture-pane -t edb -p | grep -q "launched"; do sleep 0.2; done'
tmux send-keys -t edb 'ss landing' Enter
tmux capture-pane -t edb -p
```

Screenshots land in `$TMPDIR/electrondb-shots/` (override: `SCREENSHOT_DIR`). Always open and look at the screenshot — a blank frame means the launch failed.

### Commands

| command | what it does |
|---|---|
| `launch` / `launch real` | launch app (sandbox userData / real profile), waits for notes UI |
| `add-note <title> [:: <content>]` | create a note through the real form |
| `notes` | print the rendered notes list |
| `delete-note <text>` | delete first note whose row contains text |
| `ss [name]` | screenshot → shots dir |
| `click <css-sel>` / `click-text <text>` | click via DOM |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` / `text [css-sel]` | evaluate in page / print innerText |
| `windows` | list window URLs |
| `quit` | close app, delete sandbox, exit |

## Run (human path)

```bash
npm run dev   # dev server with HMR, opens a window; Ctrl-C to quit
```

## App test hooks (env vars, set before launching)

- `ELECTRONDB_USER_DATA=<dir>` — redirect userData (the driver's sandbox mode uses this)
- `ELECTRONDB_MIGRATIONS_DIR=<dir>` — override the drizzle migrations folder (stage fake/broken migrations in a temp copy; never edit the repo's `drizzle/`)
- `ELECTRONDB_MIGRATION_CHOICE=quit|restore` — auto-answer the migration-failure dialog (it's a native dialog; it cannot be clicked programmatically)

The e2e suite (`npm run test:e2e`, specs in `e2e/`) covers CRUD and the migration/backup/restore flows using these same hooks — prefer extending it for regression coverage; use this driver for interactive poking and screenshots.

## Gotchas

- **DB access**: the app's better-sqlite3 is compiled for Electron's ABI — you cannot `require` it from plain Node scripts. Inspect DBs with the `sqlite3` CLI or through the app UI.
- **Migration-failure dialog** blocks the main process (`showMessageBoxSync`) and never creates a window — a plain `launch` against a broken migration will hang the driver's ready-wait. Use the `ELECTRONDB_MIGRATION_CHOICE` env hook instead.
- **Headless Linux**: prefix with `xvfb-run -a`; the driver already adds `--no-sandbox` on Linux.
