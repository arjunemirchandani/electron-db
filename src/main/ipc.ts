import { ipcMain } from 'electron'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
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
