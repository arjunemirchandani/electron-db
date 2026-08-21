import { test as base, expect } from '@playwright/test'
import { _electron, type ElectronApplication, type Page } from 'playwright'
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const APP_DIR = path.resolve(__dirname, '..')

// Required from plain Node (not inside Electron), the electron package
// exports the path to its binary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const ELECTRON_BIN = require('electron') as unknown as string

// Electron's SUID sandbox is unavailable on CI Linux runners.
const EXTRA_ARGS = process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : []

export interface LaunchResult {
  app: ElectronApplication
  page: Page
}

export type LaunchFn = (env?: Record<string, string>) => Promise<LaunchResult>

interface Fixtures {
  /** Per-test throwaway userData directory the app is pointed at. */
  userDataDir: string
  /** Launch the built app and wait for the notes UI. Callable repeatedly to relaunch. */
  launch: LaunchFn
  /** Run the app to self-exit (migration-failure paths) and capture output. */
  runToExit: (env?: Record<string, string>) => SpawnSyncReturns<string>
  /** Copy the real drizzle folder to a temp dir and append an extra migration. */
  stageMigration: (sql: string) => string
  /** Backup files currently present in userDataDir. */
  backups: () => string[]
}

export const test = base.extend<Fixtures>({
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electrondb-e2e-'))
    await use(dir)
    fs.rmSync(dir, { recursive: true, force: true })
  },

  launch: async ({ userDataDir }, use) => {
    const mainEntry = path.join(APP_DIR, 'out', 'main', 'index.js')
    if (!fs.existsSync(mainEntry)) {
      throw new Error(
        'Built output missing — run `npm run build` first (or use `npm run test:e2e`)'
      )
    }
    const apps: ElectronApplication[] = []
    await use(async (env = {}) => {
      const app = await _electron.launch({
        executablePath: ELECTRON_BIN,
        args: [APP_DIR, ...EXTRA_ARGS],
        env: { ...process.env, ELECTRONDB_USER_DATA: userDataDir, ...env },
        timeout: 30_000
      })
      apps.push(app)
      const page = await app.firstWindow()
      await page.waitForSelector('.notes-form input', { timeout: 15_000 })
      return { app, page }
    })
    for (const app of apps) {
      await app.close().catch(() => {})
    }
  },

  runToExit: async ({ userDataDir }, use) => {
    await use((env = {}) =>
      spawnSync(ELECTRON_BIN, [APP_DIR, ...EXTRA_ARGS], {
        env: { ...process.env, ELECTRONDB_USER_DATA: userDataDir, ...env },
        encoding: 'utf8',
        timeout: 60_000
      })
    )
  },

  stageMigration: async ({}, use) => {
    const created: string[] = []
    await use((sql) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electrondb-migrations-'))
      fs.cpSync(path.join(APP_DIR, 'drizzle'), dir, { recursive: true })
      const tag = '0001_e2e_extra'
      fs.writeFileSync(path.join(dir, `${tag}.sql`), sql)
      const journalPath = path.join(dir, 'meta', '_journal.json')
      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'))
      journal.entries.push({
        idx: journal.entries.length,
        version: '6',
        when: journal.entries[journal.entries.length - 1].when + 1,
        tag,
        breakpoints: true
      })
      fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2))
      created.push(dir)
      return dir
    })
    for (const dir of created) fs.rmSync(dir, { recursive: true, force: true })
  },

  backups: async ({ userDataDir }, use) => {
    await use(() => fs.readdirSync(userDataDir).filter((f) => f.includes('backup')))
  }
})

export { expect }
