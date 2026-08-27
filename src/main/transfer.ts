import { app, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { desc, eq } from 'drizzle-orm'
import { getDb } from './db'
import { notes, noteTags, tags } from './db/schema'

export const EXPORT_FORMAT = 'electrondb-export'
export const EXPORT_FORMAT_VERSION = 1

const META_MAX_ENTRIES = 20
const META_MAX_KEY = 40
const META_MAX_VALUE = 400

// Normalize and validate externally-supplied properties: string keys and
// values only, trimmed keys, size caps — anything else is rejected loudly.
export function cleanMetadata(raw: unknown): Record<string, string> {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid properties')
  const clean: Record<string, string> = {}
  for (const [rawKey, value] of Object.entries(raw)) {
    const key = rawKey.trim()
    if (!key) continue
    if (typeof value !== 'string') throw new Error('Property values must be text')
    if (key.length > META_MAX_KEY)
      throw new Error(`Property names are limited to ${META_MAX_KEY} characters`)
    if (value.length > META_MAX_VALUE)
      throw new Error(`Property values are limited to ${META_MAX_VALUE} characters`)
    clean[key] = value
  }
  if (Object.keys(clean).length > META_MAX_ENTRIES) {
    throw new Error(`A note can have at most ${META_MAX_ENTRIES} properties`)
  }
  return clean
}

interface ExportedNote {
  title: string
  content: string
  createdAt: string
  updatedAt: string | null
  metadata: Record<string, string>
  /** Tag names — ids are meaningless outside the source database. */
  tags: string[]
}

interface ExportFile {
  format: typeof EXPORT_FORMAT
  formatVersion: number
  exportedAt: string
  appVersion: string
  tags: Array<{ name: string; hue: number | null }>
  notes: ExportedNote[]
}

function buildExportFile(): ExportFile {
  const db = getDb()
  const tagRows = db.select().from(tags).orderBy(tags.name).all()
  const links = db
    .select({ noteId: noteTags.noteId, name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .orderBy(tags.name)
    .all()
  const tagsFor = new Map<number, string[]>()
  for (const link of links) {
    tagsFor.set(link.noteId, [...(tagsFor.get(link.noteId) ?? []), link.name])
  }
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    tags: tagRows.map((t) => ({ name: t.name, hue: t.hue })),
    notes: db
      .select()
      .from(notes)
      .orderBy(desc(notes.id))
      .all()
      .map((note) => ({
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        metadata: note.metadata ?? {},
        tags: tagsFor.get(note.id) ?? []
      }))
  }
}

export async function exportToFile(): Promise<{ path: string; notes: number } | null> {
  // Test hook: bypass the native save dialog.
  let path = process.env.ELECTRONDB_EXPORT_PATH
  if (!path) {
    const result = await dialog.showSaveDialog({
      title: 'Export notes',
      defaultPath: `electrondb-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'ElectronDB export', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    path = result.filePath
  }
  const data = buildExportFile()
  writeFileSync(path, JSON.stringify(data, null, 2))
  console.log(`[transfer] exported ${data.notes.length} notes to ${path}`)
  return { path, notes: data.notes.length }
}
