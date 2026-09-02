import { sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  /** Set on every edit; null means never edited. */
  updatedAt: text('updated_at'),
  /** Flexible per-note properties; stored as a JSON object of strings. */
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, string>>(),
  /** Pinned notes sort above everything else. */
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  /** Soft-delete stamp; hidden while set, purged after a day. */
  deletedAt: text('deleted_at')
})

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  /** User-chosen hue (0-359); null means "derive from the name". */
  hue: integer('hue')
})

export const noteTags = sqliteTable(
  'note_tags',
  {
    noteId: integer('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (table) => [primaryKey({ columns: [table.noteId, table.tagId] })]
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
export type Tag = typeof tags.$inferSelect
