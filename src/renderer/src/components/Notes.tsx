import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackupInfo, Note, Tag } from '../../../shared/types'
import TagInput, { type TagInputHandle } from './TagInput'
import { tagStyle } from '../lib/tagColor'

function Notes(): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const tagInputRef = useRef<TagInputHandle>(null)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterMode, setFilterMode] = useState<'all' | 'any'>('all')
  const [addingTagFor, setAddingTagFor] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const [nextNotes, nextTags] = await Promise.all([window.api.listNotes(), window.api.listTags()])
    setNotes(nextNotes)
    setAllTags(nextTags)
    setFilterTags((current) => current.filter((name) => nextTags.some((t) => t.name === name)))
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.listNotes(), window.api.listTags(), window.api.listBackups()])
      .then(([nextNotes, nextTags, nextBackups]) => {
        if (cancelled) return
        setNotes(nextNotes)
        setAllTags(nextTags)
        setBackups(nextBackups)
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
      const tagNames = tagInputRef.current?.flush() ?? newTags
      await window.api.createNote({ title, content, tags: tagNames })
      setTitle('')
      setContent('')
      setNewTags([])
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

  const addTagsToNote = async (noteId: number, names: string[]): Promise<void> => {
    for (const name of names) await window.api.addTag(noteId, name)
    setAddingTagFor(null)
    await refresh()
  }

  const refreshBackups = useCallback(async (): Promise<void> => {
    setBackups(await window.api.listBackups())
  }, [])

  const backupNow = async (): Promise<void> => {
    setBackingUp(true)
    setBackupStatus(null)
    try {
      const path = await window.api.backupNow()
      const filename = path.split(/[\\/]/).pop()
      setBackupStatus(`Backed up to ${filename}`)
      await refreshBackups()
    } catch (err) {
      setBackupStatus(`Backup failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBackingUp(false)
    }
  }

  const restoreBackup = async (filename: string): Promise<void> => {
    setRestoring(true)
    setBackupStatus(null)
    try {
      await window.api.restoreBackup(filename)
      setPendingRestore(null)
      setFilterTags([])
      setBackupStatus(`Restored ${filename}`)
      await Promise.all([refresh(), refreshBackups()])
    } catch (err) {
      setBackupStatus(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRestoring(false)
    }
  }

  const deleteBackup = async (filename: string): Promise<void> => {
    await window.api.deleteBackup(filename)
    await refreshBackups()
  }

  const formatSize = (bytes: number): string =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`

  const toggleFilter = (name: string): void =>
    setFilterTags((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name]
    )

  const visibleNotes =
    filterTags.length === 0
      ? notes
      : notes.filter((note) => {
          const names = note.tags.map((t) => t.name)
          return filterMode === 'all'
            ? filterTags.every((name) => names.includes(name))
            : filterTags.some((name) => names.includes(name))
        })

  const tagCounts = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1)
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
        <TagInput
          ref={tagInputRef}
          className="notes-form-tags"
          value={newTags}
          onChange={setNewTags}
          suggestions={allTags.map((t) => t.name)}
          placeholder="Tags"
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
              className={`tag-chip ${filterTags.includes(tag.name) ? 'tag-chip-active' : ''}`}
              style={tagStyle(tag.name)}
              onClick={() => toggleFilter(tag.name)}
            >
              {tag.name}
              <span className="tag-count">{tagCounts.get(tag.name) ?? 0}</span>
            </button>
          ))}
          {filterTags.length > 0 && (
            <span className="tag-filter-state">
              {filterTags.length > 1 && (
                <span className="filter-mode" role="group" aria-label="Match mode">
                  <button
                    className={filterMode === 'all' ? 'filter-mode-active' : ''}
                    onClick={() => setFilterMode('all')}
                  >
                    all
                  </button>
                  <button
                    className={filterMode === 'any' ? 'filter-mode-active' : ''}
                    onClick={() => setFilterMode('any')}
                  >
                    any
                  </button>
                </span>
              )}
              {visibleNotes.length} of {notes.length}
              <button className="tag-filter-clear" onClick={() => setFilterTags([])}>
                Clear
              </button>
            </span>
          )}
        </div>
      )}
      <ul className="notes-list">
        {visibleNotes.length === 0 && (
          <li className="notes-empty">
            {filterTags.length > 0
              ? `No notes match ${filterMode === 'all' ? 'all of' : 'any of'} ${filterTags.join(', ')}.`
              : 'No notes yet — add one above.'}
          </li>
        )}
        {visibleNotes.map((note) => (
          <li key={note.id}>
            <div>
              <strong>{note.title}</strong>
              {note.content && <span> — {note.content}</span>}
              <span className="note-tags">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="tag-chip tag-chip-static"
                    style={tagStyle(tag.name)}
                  >
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
                {addingTagFor === note.id ? (
                  <TagInput
                    className="tag-input-inline"
                    value={[]}
                    onChange={(names) => addTagsToNote(note.id, names)}
                    suggestions={allTags
                      .map((t) => t.name)
                      .filter((name) => !note.tags.some((t) => t.name === name))}
                    placeholder="Add tag"
                    autoFocus
                    onDismiss={() => setAddingTagFor(null)}
                  />
                ) : (
                  <button
                    className="tag-add"
                    title="Add tag"
                    onClick={() => setAddingTagFor(note.id)}
                  >
                    +
                  </button>
                )}
              </span>
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
        <button className="backups-toggle" onClick={() => setShowBackups((v) => !v)}>
          {showBackups ? 'Hide Backups' : `Backups (${backups.length})`}
        </button>
        {backupStatus && <span className="backup-status">{backupStatus}</span>}
      </div>
      {showBackups && (
        <ul className="backups-list">
          {backups.length === 0 && <li className="notes-empty">No backups yet.</li>}
          {backups.map((backup) => (
            <li key={backup.filename}>
              <div className="backup-meta">
                <strong>{new Date(backup.createdAt).toLocaleString()}</strong>
                <span className="backup-detail">
                  v{backup.appVersion} · {formatSize(backup.sizeBytes)}
                </span>
              </div>
              {pendingRestore === backup.filename ? (
                <div className="backup-actions">
                  <span className="backup-confirm-text">Replace current data?</span>
                  <button
                    className="backup-confirm"
                    onClick={() => restoreBackup(backup.filename)}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring…' : 'Confirm'}
                  </button>
                  <button onClick={() => setPendingRestore(null)} disabled={restoring}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="backup-actions">
                  <button onClick={() => setPendingRestore(backup.filename)}>Restore</button>
                  <button onClick={() => deleteBackup(backup.filename)}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Notes
