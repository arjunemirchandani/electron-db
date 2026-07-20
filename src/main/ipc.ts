import { ipcMain } from 'electron'
import { desc, eq } from 'drizzle-orm'
import { createBackup, getDb } from './db'
import { notes } from './db/schema'
import type { NewNoteInput, Note } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('notes:list', (): Note[] => {
    return getDb().select().from(notes).orderBy(desc(notes.id)).all()
  })

  ipcMain.handle('notes:create', (_event, input: NewNoteInput): Note => {
    if (typeof input?.title !== 'string' || input.title.trim() === '') {
      throw new Error('Note title is required')
    }
    return getDb()
      .insert(notes)
      .values({ title: input.title.trim(), content: input.content ?? '' })
      .returning()
      .get()
  })

  ipcMain.handle('notes:delete', (_event, id: number): void => {
    if (!Number.isInteger(id)) throw new Error('Invalid note id')
    getDb().delete(notes).where(eq(notes.id, id)).run()
  })

  ipcMain.handle('db:backup', (): Promise<string> => {
    return createBackup()
  })
}
