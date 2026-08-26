import { useCallback, useEffect, useRef, useState } from 'react'
import type { BackupInfo, Note, Tag } from '../../../shared/types'
import TagInput, { type TagInputHandle } from './TagInput'
import ManageTags from './ManageTags'
import NoteRow from './NoteRow'
import BackupsPanel from './BackupsPanel'
import { Toolbar } from './primitives'
import { tagStyle } from '../lib/tagColor'
import { SearchIcon } from './icons'

function Notes(): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const tagInputRef = useRef<TagInputHandle>(null)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [metaFilter, setMetaFilter] = useState<{ key: string; value: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'any'>('all')
  const [addingTagFor, setAddingTagFor] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [showManageTags, setShowManageTags] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const [nextNotes, nextTags] = await Promise.all([window.api.listNotes(), window.api.listTags()])
    setNotes(nextNotes)
    setAllTags(nextTags)
    setFilterTags((current) => current.filter((name) => nextTags.some((t) => t.name === name)))
  }, [])

  const refreshBackups = useCallback(async (): Promise<void> => {
    setBackups(await window.api.listBackups())
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

  const searchActive = searchQuery.trim().length > 0

  // Re-runs on note changes too, so results stay fresh after edits/deletes.
  // Whether search applies is derived from the query; stale results are
  // simply ignored once the box is cleared.
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return
    const timer = setTimeout(() => {
      window.api
        .searchNotes(query)
        .then(setSearchResults)
        .catch((e) => setError(String(e)))
    }, 180)
    return () => clearTimeout(timer)
  }, [searchQuery, notes])

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
    setBackupStatus(null)
    try {
      await window.api.restoreBackup(filename)
      setFilterTags([])
      setBackupStatus(`Restored ${filename}`)
      await Promise.all([refresh(), refreshBackups()])
    } catch (err) {
      setBackupStatus(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  const deleteBackup = async (filename: string): Promise<void> => {
    await window.api.deleteBackup(filename)
    await refreshBackups()
  }

  const toggleFilter = (name: string): void =>
    setFilterTags((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name]
    )

  const baseNotes = searchActive && searchResults ? searchResults : notes
  const tagFiltered =
    filterTags.length === 0
      ? baseNotes
      : baseNotes.filter((note) => {
          const names = note.tags.map((t) => t.name)
          return filterMode === 'all'
            ? filterTags.every((name) => names.includes(name))
            : filterTags.some((name) => names.includes(name))
        })
  const visibleNotes = metaFilter
    ? tagFiltered.filter((note) => note.metadata[metaFilter.key] === metaFilter.value)
    : tagFiltered

  const hueFor = (name: string): number | null | undefined =>
    allTags.find((t) => t.name === name)?.hue

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
          hueFor={hueFor}
          placeholder="Tags"
        />
        <button type="submit" className="button-primary">
          Add
        </button>
      </form>
      {error && <p className="notes-error">{error}</p>}
      <div className="notes-search">
        <SearchIcon />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
        />
        {searchActive && searchResults !== null && (
          <span className="search-count">
            {visibleNotes.length} of {notes.length}
          </span>
        )}
        {searchQuery && (
          <button className="tag-filter-clear" onClick={() => setSearchQuery('')}>
            Clear
          </button>
        )}
        {metaFilter && (
          <button
            className="meta-pill meta-pill-active"
            title="Clear property filter"
            onClick={() => setMetaFilter(null)}
          >
            <span className="meta-key">{metaFilter.key}</span>
            {metaFilter.value} ×
          </button>
        )}
      </div>
      {allTags.length > 0 && (
        <Toolbar className="tag-filter">
          <span className="tag-filter-label">Filter:</span>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${filterTags.includes(tag.name) ? 'tag-chip-active' : ''}`}
              style={tagStyle(tag.name, tag.hue)}
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
        </Toolbar>
      )}
      <ul className="notes-list">
        {visibleNotes.length === 0 && (
          <li className="notes-empty">
            {searchActive && searchResults !== null ? (
              <>
                <strong>No notes match “{searchQuery.trim()}”.</strong>
                <span>
                  Search covers titles and content.{' '}
                  <button className="tag-filter-clear" onClick={() => setSearchQuery('')}>
                    Clear the search
                  </button>
                  .
                </span>
              </>
            ) : filterTags.length > 0 ? (
              <>
                <strong>
                  No notes match {filterMode === 'all' ? 'all of' : 'any of'}{' '}
                  {filterTags.join(', ')}.
                </strong>
                <span>
                  Try switching to {filterMode === 'all' ? '“any”' : '“all”'} or{' '}
                  <button className="tag-filter-clear" onClick={() => setFilterTags([])}>
                    clear the filter
                  </button>
                  .
                </span>
              </>
            ) : (
              <>
                <strong>No notes yet — add one above.</strong>
                <span>
                  Tags help you find notes later; the filter bar appears once you have some.
                </span>
              </>
            )}
          </li>
        )}
        {visibleNotes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            tagSuggestions={allTags.map((t) => t.name)}
            hueFor={hueFor}
            addingTag={addingTagFor === note.id}
            onStartAddTag={() => setAddingTagFor(note.id)}
            onCancelAddTag={() => setAddingTagFor(null)}
            onAddTags={(names) => addTagsToNote(note.id, names)}
            onRemoveTag={(tagId) => removeTag(note.id, tagId)}
            onFilterMeta={(key, value) =>
              setMetaFilter((current) =>
                current && current.key === key && current.value === value ? null : { key, value }
              )
            }
            onUpdate={async (input) => {
              await window.api.updateNote(note.id, input)
              await refresh()
            }}
            onDelete={() => removeNote(note.id)}
          />
        ))}
      </ul>
      <Toolbar className="notes-backup">
        <button onClick={backupNow} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Back Up Database'}
        </button>
        <button className="backups-toggle" onClick={() => setShowBackups((v) => !v)}>
          {showBackups ? 'Hide Backups' : `Backups (${backups.length})`}
        </button>
        <button className="manage-tags-toggle" onClick={() => setShowManageTags((v) => !v)}>
          {showManageTags ? 'Hide Tags' : `Manage Tags (${allTags.length})`}
        </button>
        {backupStatus && <span className="backup-status">{backupStatus}</span>}
      </Toolbar>
      {showManageTags && <ManageTags tags={allTags} counts={tagCounts} onChanged={refresh} />}
      {showBackups && (
        <BackupsPanel backups={backups} onRestore={restoreBackup} onDelete={deleteBackup} />
      )}
    </div>
  )
}

export default Notes
