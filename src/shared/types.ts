// Shared IPC contract between main, preload, and renderer.
// Main-process code must stay assignable to these shapes; the compiler
// enforces it where handlers declare these as return types.

export interface Tag {
  id: number
  name: string
}

export interface Note {
  id: number
  title: string
  content: string
  createdAt: string
  tags: Tag[]
}

export interface NewNoteInput {
  title: string
  content?: string
  /** Tag names; created on the fly if they don't exist yet. */
  tags?: string[]
}

export interface DbApi {
  listNotes: () => Promise<Note[]>
  createNote: (input: NewNoteInput) => Promise<Note>
  deleteNote: (id: number) => Promise<void>
  /** All tags currently attached to at least one note. */
  listTags: () => Promise<Tag[]>
  /** Attach a tag (by name, created if needed) to a note. */
  addTag: (noteId: number, name: string) => Promise<void>
  /** Detach a tag from a note; orphaned tags are pruned. */
  removeTag: (noteId: number, tagId: number) => Promise<void>
  /** Snapshot the database now; resolves to the backup file's path. */
  backupNow: () => Promise<string>
}
