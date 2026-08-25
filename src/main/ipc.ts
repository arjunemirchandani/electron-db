import { ipcMain } from 'electron'
import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { createBackup, deleteBackup, getDb, listBackups, restoreBackup } from './db'
import { notes, noteTags, tags } from './db/schema'
import type { BackupInfo, NewNoteInput, Note, Tag } from '../shared/types'

function tagsByNote(): Map<number, Tag[]> {
  const rows = getDb()
    .select({ noteId: noteTags.noteId, id: tags.id, name: tags.name, hue: tags.hue })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .orderBy(tags.name)
    .all()
  const map = new Map<number, Tag[]>()
  for (const row of rows) {
    const list = map.get(row.noteId) ?? []
    list.push({ id: row.id, name: row.name, hue: row.hue })
    map.set(row.noteId, list)
  }
  return map
}

function attachTag(noteId: number, name: string): void {
  const db = getDb()
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = db.select().from(tags).where(eq(tags.name, trimmed)).get()
  const tag = existing ?? db.insert(tags).values({ name: trimmed }).returning().get()
  db.insert(noteTags).values({ noteId, tagId: tag.id }).onConflictDoNothing().run()
}

function pruneOrphanTags(): void {
  const db = getDb()
  const used = db.select({ tagId: noteTags.tagId }).from(noteTags).all()
  const usedIds = [...new Set(used.map((r) => r.tagId))]
  if (usedIds.length === 0) {
    db.delete(tags).run()
  } else {
    db.delete(tags).where(notInArray(tags.id, usedIds)).run()
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('notes:list', (): Note[] => {
    const byNote = tagsByNote()
    return getDb()
      .select()
      .from(notes)
      .orderBy(desc(notes.id))
      .all()
      .map((note) => ({ ...note, tags: byNote.get(note.id) ?? [] }))
  })

  ipcMain.handle('notes:create', (_event, input: NewNoteInput): Note => {
    if (typeof input?.title !== 'string' || input.title.trim() === '') {
      throw new Error('Note title is required')
    }
    const note = getDb()
      .insert(notes)
      .values({ title: input.title.trim(), content: input.content ?? '' })
      .returning()
      .get()
    for (const name of input.tags ?? []) attachTag(note.id, name)
    return { ...note, tags: tagsByNote().get(note.id) ?? [] }
  })

  ipcMain.handle(
    'notes:update',
    (_event, id: number, input: { title: string; content?: string }): Note => {
      if (!Number.isInteger(id)) throw new Error('Invalid note id')
      if (typeof input?.title !== 'string' || input.title.trim() === '') {
        throw new Error('Note title is required')
      }
      const note = getDb()
        .update(notes)
        .set({
          title: input.title.trim(),
          content: input.content ?? '',
          updatedAt: sql`(datetime('now'))`
        })
        .where(eq(notes.id, id))
        .returning()
        .get()
      if (!note) throw new Error('Note not found')
      return { ...note, tags: tagsByNote().get(note.id) ?? [] }
    }
  )

  ipcMain.handle('notes:search', (_event, query: string): Note[] => {
    if (typeof query !== 'string') throw new Error('Invalid search query')
    // Sanitize into FTS5 phrase tokens: word/number runs only, each quoted
    // (so user text is never query syntax), the last as a prefix for
    // search-as-you-type. Punctuation-only input behaves like an empty box.
    const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? []
    const byNote = tagsByNote()
    if (tokens.length === 0) {
      return getDb()
        .select()
        .from(notes)
        .orderBy(desc(notes.id))
        .all()
        .map((note) => ({ ...note, tags: byNote.get(note.id) ?? [] }))
    }
    const expression = tokens.map((t, i) => `"${t}"${i === tokens.length - 1 ? '*' : ''}`).join(' ')
    // Best matches first: a title hit outweighs a content hit 10:1. The
    // \u0001/\u0002 markers are split into <mark> elements by the renderer,
    // so note text is never interpreted as HTML.
    const ranked = getDb().all<{ id: number; ht: string; cs: string }>(
      sql`SELECT rowid AS id,
            highlight(notes_fts, 0, char(1), char(2)) AS ht,
            snippet(notes_fts, 1, char(1), char(2), '…', 12) AS cs
          FROM notes_fts WHERE notes_fts MATCH ${expression}
          ORDER BY bm25(notes_fts, 10.0, 1.0)`
    )
    if (ranked.length === 0) return []
    const rows = getDb()
      .select()
      .from(notes)
      .where(
        inArray(
          notes.id,
          ranked.map((r) => r.id)
        )
      )
      .all()
    const byId = new Map(rows.map((note) => [note.id, note]))
    return ranked.flatMap((r) => {
      const note = byId.get(r.id)
      if (!note) return []
      return [
        {
          ...note,
          tags: byNote.get(note.id) ?? [],
          highlightedTitle: r.ht,
          contentSnippet: r.cs
        }
      ]
    })
  })

  ipcMain.handle('notes:delete', (_event, id: number): void => {
    if (!Number.isInteger(id)) throw new Error('Invalid note id')
    getDb().delete(notes).where(eq(notes.id, id)).run()
    pruneOrphanTags()
  })

  ipcMain.handle('tags:list', (): Tag[] => {
    const used = getDb().select({ tagId: noteTags.tagId }).from(noteTags).all()
    const usedIds = [...new Set(used.map((r) => r.tagId))]
    if (usedIds.length === 0) return []
    return getDb().select().from(tags).where(inArray(tags.id, usedIds)).orderBy(tags.name).all()
  })

  ipcMain.handle('tags:add', (_event, noteId: number, name: string): void => {
    if (!Number.isInteger(noteId)) throw new Error('Invalid note id')
    if (typeof name !== 'string' || name.trim() === '') throw new Error('Tag name is required')
    attachTag(noteId, name)
  })

  ipcMain.handle('tags:remove', (_event, noteId: number, tagId: number): void => {
    if (!Number.isInteger(noteId) || !Number.isInteger(tagId)) throw new Error('Invalid ids')
    getDb()
      .delete(noteTags)
      .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
      .run()
    pruneOrphanTags()
  })

  ipcMain.handle('tags:setHue', (_event, tagId: number, hue: number | null): void => {
    if (!Number.isInteger(tagId)) throw new Error('Invalid tag id')
    if (hue !== null && (!Number.isInteger(hue) || hue < 0 || hue > 359)) {
      throw new Error('Hue must be an integer from 0 to 359, or null')
    }
    getDb().update(tags).set({ hue }).where(eq(tags.id, tagId)).run()
  })

  ipcMain.handle('tags:rename', (_event, tagId: number, name: string): void => {
    if (!Number.isInteger(tagId)) throw new Error('Invalid tag id')
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) throw new Error('Tag name is required')
    const db = getDb()
    const clash = db.select().from(tags).where(eq(tags.name, trimmed)).get()
    if (clash && clash.id !== tagId) {
      throw new Error(`A tag named "${trimmed}" already exists — merge into it instead`)
    }
    db.update(tags).set({ name: trimmed }).where(eq(tags.id, tagId)).run()
  })

  ipcMain.handle('tags:merge', (_event, sourceId: number, targetId: number): void => {
    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) throw new Error('Invalid ids')
    if (sourceId === targetId) throw new Error('Choose a different tag to merge into')
    const db = getDb()
    const links = db.select().from(noteTags).where(eq(noteTags.tagId, sourceId)).all()
    for (const link of links) {
      db.insert(noteTags)
        .values({ noteId: link.noteId, tagId: targetId })
        .onConflictDoNothing()
        .run()
    }
    // Cascade removes the source's remaining links.
    db.delete(tags).where(eq(tags.id, sourceId)).run()
  })

  ipcMain.handle('tags:delete', (_event, tagId: number): void => {
    if (!Number.isInteger(tagId)) throw new Error('Invalid tag id')
    getDb().delete(tags).where(eq(tags.id, tagId)).run()
  })

  ipcMain.handle('db:backup', (): Promise<string> => {
    return createBackup()
  })

  ipcMain.handle('backups:list', (): BackupInfo[] => listBackups())

  ipcMain.handle('backups:restore', (_event, filename: string): Promise<void> => {
    if (typeof filename !== 'string') throw new Error('Invalid backup filename')
    return restoreBackup(filename)
  })

  ipcMain.handle('backups:delete', (_event, filename: string): void => {
    if (typeof filename !== 'string') throw new Error('Invalid backup filename')
    deleteBackup(filename)
  })
}
