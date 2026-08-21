#!/usr/bin/env node
// REPL driver for ElectronDB. Launches the built Electron app via
// Playwright and exposes line-based commands (launch, click, ss, ...)
// so an agent can drive the real UI from a terminal or tmux session.
//
// Usage:            node .claude/skills/run-electrondb/driver.mjs
// Piped one-shot:   printf 'launch\nnotes\nquit\n' | node driver.mjs
import { createRequire } from 'node:module'
import * as readline from 'node:readline'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
// playwright is a transitive dep of @playwright/test; electron's package
// entry resolves to the binary path when required from plain Node.
const { _electron } = require('playwright')
const ELECTRON_BIN = require('electron')

const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'electrondb-shots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

// Electron's SUID sandbox is unavailable on headless Linux containers.
const EXTRA_ARGS = process.platform === 'linux' ? ['--no-sandbox'] : []

let app = null
let page = null
let sandboxDir = null

const COMMANDS = {
  // launch          → sandbox mode: throwaway userData dir (safe default)
  // launch real     → the user's real profile and database
  async launch(mode) {
    if (app) return console.log('already launched')
    if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
      return console.log('ERROR: no build output — run `npm run build` in the project first')
    }
    const env = { ...process.env }
    if (mode !== 'real') {
      sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electrondb-driver-'))
      env.ELECTRONDB_USER_DATA = sandboxDir
    }
    app = await _electron.launch({
      executablePath: ELECTRON_BIN,
      args: [APP_DIR, ...EXTRA_ARGS],
      env,
      timeout: 30_000
    })
    page = await app.firstWindow()
    await page.waitForSelector('.notes-form input', { timeout: 15_000 })
    console.log(`launched (${mode === 'real' ? 'REAL user data' : `sandbox: ${sandboxDir}`})`)
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first')
    const file = path.join(SHOT_DIR, `${name || `ss-${Date.now()}`}.png`)
    await page.screenshot({ path: file })
    console.log('screenshot:', file)
  },

  // resize <width> <height> — resize the app window (launch default is 900x670)
  async resize(rest) {
    if (!app) return console.log('ERROR: launch first')
    const [w, h] = rest.split(/\s+/).map(Number)
    if (!w || !h) return console.log('usage: resize <width> <height>')
    await app.evaluate(({ BrowserWindow }, size) => {
      BrowserWindow.getAllWindows()[0].setContentSize(size.w, size.h)
    }, { w, h })
    console.log(`resized to ${w}x${h}`)
  },

  // App-specific helpers -------------------------------------------------

  // add-note <title> [:: <content>]
  async 'add-note'(rest) {
    if (!page) return console.log('ERROR: launch first')
    const [title, content = ''] = rest.split('::').map((s) => s.trim())
    if (!title) return console.log('usage: add-note <title> [:: <content>]')
    await page.fill('input[placeholder="Title"]', title)
    await page.fill('input[placeholder^="Content"]', content)
    await page.click('.notes-form button[type="submit"]')
    await page.waitForSelector(`.notes-list li:has-text(${JSON.stringify(title)})`)
    console.log('added:', title)
  },

  async notes() {
    if (!page) return console.log('ERROR: launch first')
    console.log(await page.innerText('.notes-list'))
  },

  // delete-note <text> — deletes the first note whose row contains <text>
  async 'delete-note'(text) {
    if (!page) return console.log('ERROR: launch first')
    const row = page.locator('.notes-list li', { hasText: text }).first()
    if ((await row.count()) === 0) return console.log('NOT_FOUND:', text)
    await row.getByRole('button', { name: 'Delete' }).click()
    await row.waitFor({ state: 'detached', timeout: 10_000 })
    console.log('deleted:', text)
  },

  // Generic page commands ------------------------------------------------

  async click(sel) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK'
    }, sel)
    console.log('click', sel, '→', r)
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')]
      const el =
        els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t))
      if (!el) return 'NOT_FOUND'
      el.click()
      return `OK: ${el.tagName}`
    }, text)
    console.log('click-text', JSON.stringify(text), '→', r)
  },

  async type(text) {
    if (page) await page.keyboard.type(text, { delay: 30 })
  },

  async press(key) {
    if (page) await page.keyboard.press(key)
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first')
    try {
      await page.waitForSelector(sel, { timeout: 10_000 })
      console.log('found:', sel)
    } catch {
      console.log('TIMEOUT:', sel)
    }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first')
    try {
      console.log(JSON.stringify(await page.evaluate(expr)))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first')
    console.log(
      await page.evaluate(
        (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
        sel || null
      )
    )
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first')
    for (const w of app.windows()) console.log(' ', w.url())
  },

  async quit() {
    if (app) await app.close().catch(() => {})
    if (sandboxDir) fs.rmSync(sandboxDir, { recursive: true, force: true })
    app = null
    page = null
    sandboxDir = null
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'driver> '
})

// Piped input delivers lines faster than commands finish — run them strictly
// in order through a promise chain.
let chain = Promise.resolve()
rl.on('line', (line) => {
  chain = chain.then(async () => {
    const [cmd, ...rest] = line.trim().split(/\s+/)
    if (!cmd) return rl.prompt()
    const fn = COMMANDS[cmd]
    if (!fn) {
      console.log('unknown:', cmd, '— try: help')
      return rl.prompt()
    }
    try {
      await fn(rest.join(' '))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
    if (cmd === 'quit') {
      rl.close()
      process.exit(0)
    }
    rl.prompt()
  })
})
rl.on('close', () => {
  chain = chain.then(async () => {
    await COMMANDS.quit()
    process.exit(0)
  })
})

console.log('ElectronDB driver — "help" for commands, "launch" to start (sandbox) or "launch real"')
rl.prompt()
