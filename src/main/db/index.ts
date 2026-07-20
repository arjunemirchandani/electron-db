import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | null = null
let db: DB | null = null

function migrationsFolder(): string {
  // Packaged builds ship the drizzle folder via extraResources (electron-builder.yml);
  // in dev it lives at the project root.
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
}

export function initDatabase(): DB {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'electrondb.sqlite3')
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: migrationsFolder() })

  console.log(`[db] initialized at ${dbPath}`)
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('Database not initialized — call initDatabase() first')
  return db
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  db = null
}
