// Shared IPC contract between main, preload, and renderer.
// Main-process code must stay assignable to these shapes; the compiler
// enforces it where handlers declare these as return types.

export interface Note {
  id: number
  title: string
  content: string
  createdAt: string
}

export interface NewNoteInput {
  title: string
  content?: string
}

export interface DbApi {
  listNotes: () => Promise<Note[]>
  createNote: (input: NewNoteInput) => Promise<Note>
  deleteNote: (id: number) => Promise<void>
  /** Snapshot the database now; resolves to the backup file's path. */
  backupNow: () => Promise<string>
}
