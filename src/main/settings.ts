import { app } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings } from '../shared/types'

// Settings live in userData/settings.json, NOT in the database: restoring
// a backup or importing a file rolls back *data*, and must never revert
// the user's preferences. The file is also readable when the DB isn't
// (e.g. during migration-failure handling).
const SETTINGS_FILENAME = 'settings.json'

export const DEFAULT_SETTINGS: AppSettings = {
  backupRetention: 3
}

export const BACKUP_RETENTION_MIN = 1
export const BACKUP_RETENTION_MAX = 10

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILENAME)
}

// Tolerant reader (house pattern): unknown fields are ignored, invalid or
// missing values fall back to defaults, so old and future settings files
// both load cleanly.
function sanitize(raw: unknown): AppSettings {
  const settings = { ...DEFAULT_SETTINGS }
  if (raw !== null && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.backupRetention === 'number' && Number.isFinite(record.backupRetention)) {
      settings.backupRetention = Math.min(
        BACKUP_RETENTION_MAX,
        Math.max(BACKUP_RETENTION_MIN, Math.round(record.backupRetention))
      )
    }
  }
  return settings
}

export function readSettings(): AppSettings {
  try {
    return sanitize(JSON.parse(readFileSync(settingsPath(), 'utf8')))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = sanitize({ ...readSettings(), ...patch })
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2))
  return next
}
