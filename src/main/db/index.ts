import { app } from 'electron'
import { copyFileSync, existsSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

const DB_FILENAME = 'electrondb.sqlite3'
const BACKUP_PREFIX = 'electrondb.backup-'
const BACKUPS_TO_KEEP = 3

let sqlite: Database.Database | null = null
let db: DB | null = null

export class MigrationError extends Error {
  readonly backupPath: string | null

  constructor(cause: unknown, backupPath: string | null) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'MigrationError'
    this.backupPath = backupPath
  }
}

function migrationsFolder(): string {
  // Test hook: lets automated runs stage extra migrations in a temp folder.
  if (process.env.ELECTRONDB_MIGRATIONS_DIR) return process.env.ELECTRONDB_MIGRATIONS_DIR
  // Packaged builds ship the drizzle folder via extraResources (electron-builder.yml);
  // in dev it lives at the project root.
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
}

function countPendingMigrations(conn: Database.Database, folder: string): number {
  const journalPath = join(folder, 'meta', '_journal.json')
  if (!existsSync(journalPath)) return 0
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] }

  let applied = 0
  try {
    const row = conn.prepare('select count(*) as c from __drizzle_migrations').get() as {
      c: number
    }
    applied = row.c
  } catch {
    // Table doesn't exist yet — no migrations have ever been applied.
  }
  return Math.max(0, journal.entries.length - applied)
}

// The sqlite backup API copies a consistent snapshot even with WAL pages
// not yet checkpointed, unlike a plain file copy.
async function backupDatabase(conn: Database.Database, userDataDir: string): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(userDataDir, `${BACKUP_PREFIX}${stamp}-v${app.getVersion()}.sqlite3`)
  await conn.backup(backupPath)
  return backupPath
}

function pruneOldBackups(userDataDir: string): void {
  const backups = readdirSync(userDataDir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.sqlite3'))
    .sort()
  for (const file of backups.slice(0, Math.max(0, backups.length - BACKUPS_TO_KEEP))) {
    unlinkSync(join(userDataDir, file))
  }
}

export async function initDatabase(): Promise<DB> {
  if (db) return db

  const userDataDir = app.getPath('userData')
  const dbPath = join(userDataDir, DB_FILENAME)
  const existedBefore = existsSync(dbPath)

  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  const folder = migrationsFolder()
  let backupPath: string | null = null
  if (existedBefore) {
    const pending = countPendingMigrations(sqlite, folder)
    if (pending > 0) {
      backupPath = await backupDatabase(sqlite, userDataDir)
      console.log(`[db] ${pending} pending migration(s), backed up to ${backupPath}`)
      pruneOldBackups(userDataDir)
    }
  }
  try {
    migrate(db, { migrationsFolder: folder })
  } catch (error) {
    console.error('[db] migration failed:', error)
    closeDatabase()
    throw new MigrationError(error, backupPath)
  }

  console.log(`[db] initialized at ${dbPath}`)
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('Database not initialized — call initDatabase() first')
  return db
}

export function restoreFromBackup(backupPath: string): void {
  if (sqlite) throw new Error('Close the database before restoring a backup')
  const dbPath = join(app.getPath('userData'), DB_FILENAME)
  copyFileSync(backupPath, dbPath)
  // Stale WAL/SHM files from the failed database would corrupt the
  // restored copy on next open.
  for (const suffix of ['-wal', '-shm']) {
    if (existsSync(dbPath + suffix)) unlinkSync(dbPath + suffix)
  }
  console.log(`[db] restored database from ${backupPath}`)
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  db = null
}
