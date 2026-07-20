import { useEffect, useState } from 'react'
import type { Note } from '../../../shared/types'

function Notes(): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    setNotes(await window.api.listNotes())
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e)))
  }, [])

  const addNote = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    try {
      await window.api.createNote({ title, content })
      setTitle('')
      setContent('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const removeNote = async (id: number): Promise<void> => {
    await window.api.deleteNote(id)
    await refresh()
  }

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
        <button type="submit">Add</button>
      </form>
      {error && <p className="notes-error">{error}</p>}
      <ul className="notes-list">
        {notes.length === 0 && <li className="notes-empty">No notes yet — add one above.</li>}
        {notes.map((note) => (
          <li key={note.id}>
            <div>
              <strong>{note.title}</strong>
              {note.content && <span> — {note.content}</span>}
              <div className="notes-date">{note.createdAt}</div>
            </div>
            <button onClick={() => removeNote(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Notes
