import { app, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { desc, eq } from 'drizzle-orm'
import { createBackup, getDb } from './db'
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

interface ParsedImport {
  notes: Array<{
    title: string
    content: string
    createdAt: string | undefined
    updatedAt: string | null
    metadata: Record<string, string>
    tags: string[]
  }>
  tagHues: Map<string, number | null>
}

// Accepts 'YYYY-MM-DD HH:MM:SS' (our own format) or anything Date can
// parse; returns SQLite's format, or undefined for missing/invalid input.
function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// Tolerant reader: unknown fields are ignored, but the fields we rely on
// are validated with errors that name the offending entry.
export function parseImportFile(raw: string): ParsedImport {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('That file is not valid JSON')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error("That file isn't an ElectronDB export")
  }
  const file = data as Record<string, unknown>
  if (file.format !== EXPORT_FORMAT) {
    throw new Error("That file isn't an ElectronDB export")
  }
  if (typeof file.formatVersion !== 'number' || file.formatVersion < 1) {
    throw new Error('The export has an invalid format version')
  }
  if (file.formatVersion > EXPORT_FORMAT_VERSION) {
    throw new Error(
      'This export was created by a newer version of ElectronDB — update the app to import it'
    )
  }
  // formatVersion === 1; future versions add upgrade steps here, the same
  // way database migrations replay older schemas forward.
  const tagHues = new Map<string, number | null>()
  if (Array.isArray(file.tags)) {
    for (const entry of file.tags) {
      if (typeof entry !== 'object' || entry === null) continue
      const { name, hue } = entry as Record<string, unknown>
      if (typeof name !== 'string' || !name.trim()) continue
      tagHues.set(
        name.trim(),
        typeof hue === 'number' && Number.isInteger(hue) && hue >= 0 && hue <= 359 ? hue : null
      )
    }
  }
  if (!Array.isArray(file.notes)) {
    throw new Error('The export contains no notes list')
  }
  const notesOut: ParsedImport['notes'] = []
  file.notes.forEach((entry, i) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Note ${i + 1} is not an object`)
    }
    const note = entry as Record<string, unknown>
    if (typeof note.title !== 'string' || !note.title.trim()) {
      throw new Error(`Note ${i + 1} is missing a title`)
    }
    const tagNames = Array.isArray(note.tags)
      ? note.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      : []
    notesOut.push({
      title: note.title.trim(),
      content: typeof note.content === 'string' ? note.content : '',
      createdAt: normalizeTimestamp(note.createdAt),
      updatedAt: normalizeTimestamp(note.updatedAt) ?? null,
      metadata: cleanMetadata(note.metadata),
      tags: [...new Set(tagNames.map((t) => t.trim()))]
    })
  })
  return { notes: notesOut, tagHues }
}

export async function importFromFile(): Promise<{
  path: string
  notes: number
  tagsCreated: number
} | null> {
  // Test hook: bypass the native open dialog.
  let path = process.env.ELECTRONDB_IMPORT_PATH
  if (!path) {
    const result = await dialog.showOpenDialog({
      title: 'Import notes',
      properties: ['openFile'],
      filters: [{ name: 'ElectronDB export', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    path = result.filePaths[0]
  }
  const parsed = parseImportFile(readFileSync(path, 'utf8'))
  // Imports only add, but a snapshot first makes even a regretted import
  // one-click reversible from the Backups panel.
  await createBackup()
  const db = getDb()
  let tagsCreated = 0
  db.transaction((tx) => {
    for (const entry of parsed.notes) {
      const note = tx
        .insert(notes)
        .values({
          title: entry.title,
          content: entry.content,
          ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
          updatedAt: entry.updatedAt,
          metadata: entry.metadata
        })
        .returning()
        .get()
      for (const name of entry.tags) {
        const existing = tx.select().from(tags).where(eq(tags.name, name)).get()
        let tagId: number
        if (existing) {
          tagId = existing.id
        } else {
          const created = tx
            .insert(tags)
            .values({ name, hue: parsed.tagHues.get(name) ?? null })
            .returning()
            .get()
          tagId = created.id
          tagsCreated += 1
        }
        tx.insert(noteTags).values({ noteId: note.id, tagId }).onConflictDoNothing().run()
      }
    }
  })
  console.log(
    `[transfer] imported ${parsed.notes.length} notes (${tagsCreated} new tags) from ${path}`
  )
  return { path, notes: parsed.notes.length, tagsCreated }
}
