import { useCallback, useEffect, useState } from 'react'
import type { Note, Tag } from '../../../shared/types'

function Notes(): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const [nextNotes, nextTags] = await Promise.all([window.api.listNotes(), window.api.listTags()])
    setNotes(nextNotes)
    setAllTags(nextTags)
    setFilterTag((current) =>
      current && !nextTags.some((t) => t.name === current) ? null : current
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.listNotes(), window.api.listTags()])
      .then(([nextNotes, nextTags]) => {
        if (cancelled) return
        setNotes(nextNotes)
        setAllTags(nextTags)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const addNote = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    try {
      const tagNames = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await window.api.createNote({ title, content, tags: tagNames })
      setTitle('')
      setContent('')
      setTagsInput('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const removeNote = async (id: number): Promise<void> => {
    await window.api.deleteNote(id)
    await refresh()
  }

  const removeTag = async (noteId: number, tagId: number): Promise<void> => {
    await window.api.removeTag(noteId, tagId)
    await refresh()
  }

  const backupNow = async (): Promise<void> => {
    setBackingUp(true)
    setBackupStatus(null)
    try {
      const path = await window.api.backupNow()
      const filename = path.split(/[\\/]/).pop()
      setBackupStatus(`Backed up to ${filename}`)
    } catch (err) {
      setBackupStatus(`Backup failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBackingUp(false)
    }
  }

  const visibleNotes = filterTag
    ? notes.filter((note) => note.tags.some((t) => t.name === filterTag))
    : notes

  return (
    <div className="notes">
      <h2>Notes</h2>
      <p className="notes-subtitle">Stored in SQLite via better-sqlite3 + Drizzle</p>
      <form className="notes-form" onSubmit={addNote}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content (optional)"
        />
        <input
          className="notes-tags-input"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Tags (comma separated)"
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="notes-error">{error}</p>}
      {allTags.length > 0 && (
        <div className="tag-filter">
          <span className="tag-filter-label">Filter:</span>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${filterTag === tag.name ? 'tag-chip-active' : ''}`}
              onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
      <ul className="notes-list">
        {visibleNotes.length === 0 && (
          <li className="notes-empty">
            {filterTag ? `No notes tagged “${filterTag}”.` : 'No notes yet — add one above.'}
          </li>
        )}
        {visibleNotes.map((note) => (
          <li key={note.id}>
            <div>
              <strong>{note.title}</strong>
              {note.content && <span> — {note.content}</span>}
              {note.tags.length > 0 && (
                <span className="note-tags">
                  {note.tags.map((tag) => (
                    <span key={tag.id} className="tag-chip tag-chip-static">
                      {tag.name}
                      <button
                        className="tag-remove"
                        title={`Remove tag ${tag.name}`}
                        onClick={() => removeTag(note.id, tag.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </span>
              )}
              <div className="notes-date">{note.createdAt}</div>
            </div>
            <button onClick={() => removeNote(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <div className="notes-backup">
        <button onClick={backupNow} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Back Up Database'}
        </button>
        {backupStatus && <span className="backup-status">{backupStatus}</span>}
      </div>
    </div>
  )
}

export default Notes
