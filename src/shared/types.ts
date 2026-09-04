// Shared IPC contract between main, preload, and renderer.
// Main-process code must stay assignable to these shapes; the compiler
// enforces it where handlers declare these as return types.

export interface Tag {
  id: number
  name: string
  /** User-chosen hue (0-359), or null to derive a color from the name. */
  hue: number | null
}

export interface Note {
  id: number
  title: string
  content: string
  createdAt: string
  /** Set on every edit; null means never edited. */
  updatedAt: string | null
  /** Flexible key/value properties (e.g. priority, url, due). */
  metadata: Record<string, string>
  /** Pinned notes sort above everything else. */
  pinned: boolean
  tags: Tag[]
  /** Search results only: title with matches wrapped in \u0001…\u0002. */
  highlightedTitle?: string
  /** Search results only: content excerpt with matches wrapped in \u0001…\u0002. */
  contentSnippet?: string
}

export interface NewNoteInput {
  title: string
  content?: string
  /** Tag names; created on the fly if they don't exist yet. */
  tags?: string[]
}

export interface BackupInfo {
  filename: string
  /** ISO-8601 timestamp parsed from the filename. */
  createdAt: string
  /** App version that wrote the backup. */
  appVersion: string
  sizeBytes: number
}

export interface AppSettings {
  /** How many backups to keep before pruning the oldest (1-10). */
  backupRetention: number
  /** Show the formatting toolbar above the note editor. */
  showEditorToolbar: boolean
}

export interface DbApi {
  listNotes: () => Promise<Note[]>
  createNote: (input: NewNoteInput) => Promise<Note>
  /** Update a note's title, content, and properties; stamps updatedAt. */
  updateNote: (
    id: number,
    input: { title: string; content?: string; metadata?: Record<string, string> }
  ) => Promise<Note>
  /** Case-insensitive title/content search; empty query returns everything. */
  searchNotes: (query: string) => Promise<Note[]>
  deleteNote: (id: number) => Promise<void>
  /** All tags currently attached to at least one note. */
  listTags: () => Promise<Tag[]>
  /** Attach a tag (by name, created if needed) to a note. */
  addTag: (noteId: number, name: string) => Promise<void>
  /** Detach a tag from a note; orphaned tags are pruned. */
  removeTag: (noteId: number, tagId: number) => Promise<void>
  /** Set a tag's display hue (0-359), or null to go back to the derived color. */
  setTagHue: (tagId: number, hue: number | null) => Promise<void>
  /** Rename a tag everywhere it's used; fails if the name is taken. */
  renameTag: (tagId: number, name: string) => Promise<void>
  /** Move every note from one tag to another, then delete the source tag. */
  mergeTags: (sourceId: number, targetId: number) => Promise<void>
  /** Delete a tag, detaching it from every note. */
  deleteTag: (tagId: number) => Promise<void>
  /** Export all notes and tags to a JSON file; null when the dialog is canceled. */
  exportNotes: () => Promise<{ path: string; notes: number } | null>
  /** Import an export file (a safety snapshot is taken first); null when canceled. */
  importNotes: () => Promise<{ path: string; notes: number; tagsCreated: number } | null>
  /** Snapshot the database now; resolves to the backup file's path. */
  backupNow: () => Promise<string>
  /** Backups on disk, newest first. */
  listBackups: () => Promise<BackupInfo[]>
  /** Replace the live database with a backup (a safety snapshot is taken first). */
  restoreBackup: (filename: string) => Promise<void>
  deleteBackup: (filename: string) => Promise<void>
  /** Bring a soft-deleted note back (the Undo in the delete toast). */
  restoreNote: (id: number) => Promise<void>
  /** Pin or unpin a note; pinned notes sort first. */
  setPinned: (id: number, pinned: boolean) => Promise<void>
  /** App-level preferences from userData/settings.json (not the database). */
  getSettings: () => Promise<AppSettings>
  /** Merge a partial update into settings; returns the sanitized result. */
  setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
}
