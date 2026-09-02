import { useCallback, useEffect, useRef, useState } from 'react'
import type { Note, Tag } from '../../../shared/types'
import TagInput, { type TagInputHandle } from './TagInput'
import NoteRow from './NoteRow'
import { Toolbar } from './primitives'
import { metaPillClass } from '../lib/pillStyle'
import { toastWithUndo } from './toast-context'
import { tagChipClass, tagStyle } from '../lib/tagColor'
import { SearchIcon } from './icons'

interface NotesProps {
  /** Set by the command palette: scroll to and flash this note. */
  revealNoteId?: number | null
  onRevealHandled?: () => void
  /** Set by the sidebar: replace the tag filter with this one tag. */
  tagFilter?: string | null
  onTagFilterHandled?: () => void
}

function Notes({
  revealNoteId,
  onRevealHandled,
  tagFilter,
  onTagFilterHandled
}: NotesProps): React.JSX.Element {
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

  const refresh = useCallback(async (): Promise<void> => {
    const [nextNotes, nextTags] = await Promise.all([window.api.listNotes(), window.api.listTags()])
    setNotes(nextNotes)
    setAllTags(nextTags)
    setFilterTags((current) => current.filter((name) => nextTags.some((t) => t.name === name)))
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

  useEffect(() => {
    if (revealNoteId == null) return
    const timer = setTimeout(() => {
      setSearchQuery('')
      setFilterTags([])
      setMetaFilter(null)
      setTimeout(() => {
        const row = document.querySelector(`[data-note-id="${revealNoteId}"]`)
        if (row) {
          row.scrollIntoView({ block: 'center' })
          row.classList.add('note-row-flash')
          setTimeout(() => row.classList.remove('note-row-flash'), 1300)
        }
        onRevealHandled?.()
      }, 60)
    }, 0)
    return () => clearTimeout(timer)
  }, [revealNoteId, onRevealHandled])

  useEffect(() => {
    if (tagFilter == null) return
    const timer = setTimeout(() => {
      setSearchQuery('')
      setMetaFilter(null)
      setFilterTags([tagFilter])
      onTagFilterHandled?.()
    }, 0)
    return () => clearTimeout(timer)
  }, [tagFilter, onTagFilterHandled])

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

  const removeNote = async (id: number, title: string): Promise<void> => {
    await window.api.deleteNote(id)
    await refresh()
    toastWithUndo('Note deleted', `“${title}”`, () => {
      void window.api.restoreNote(id).then(refresh)
    })
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
    <div className="notes @container flex min-h-0 flex-1 flex-col rounded-lg bg-surface-panel px-6 py-5 backdrop-blur-[9px]">
      <h2 className="text-[18px] text-fg">Notes</h2>
      <p className="notes-subtitle mb-3.5 text-[13px] text-fg-muted">
        Stored in SQLite via better-sqlite3 + Drizzle
      </p>
      <form className="notes-form mb-3.5 flex flex-wrap gap-2" onSubmit={addNote}>
        <input
          className="min-w-0 rounded-md border border-border-input bg-surface-input text-fg flex-[1_1_130px] px-2.5 py-2 text-[14px]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <input
          className="min-w-0 rounded-md border border-border-input bg-surface-input text-fg flex-[1_1_130px] px-2.5 py-2 text-[14px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content (optional)"
        />
        <TagInput
          ref={tagInputRef}
          className="notes-form-tags flex-[1_1_160px] px-2 py-[5px]"
          value={newTags}
          onChange={setNewTags}
          suggestions={allTags.map((t) => t.name)}
          hueFor={hueFor}
          placeholder="Tags"
        />
        <button type="submit" className="btn button-primary">
          Add
        </button>
      </form>
      {error && <p className="notes-error mb-2.5 text-[13px] text-[#e66]">{error}</p>}
      <div className="notes-search mb-3 flex items-center gap-2 text-fg-muted">
        <SearchIcon />
        <input
          className="min-w-0 rounded-md border border-border-input bg-surface-input text-fg flex-[1_1_120px] px-2.5 py-1.5 text-[12px]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
        />
        {searchActive && searchResults !== null && (
          <span className="search-count text-[12px] whitespace-nowrap">
            {visibleNotes.length} of {notes.length}
          </span>
        )}
        {searchQuery && (
          <button
            className="tag-filter-clear cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#8fa8ff] hover:underline"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        )}
        {metaFilter && (
          <button
            className={`meta-pill meta-pill-active ${metaPillClass(true)}`}
            title="Clear property filter"
            onClick={() => setMetaFilter(null)}
          >
            <span className="meta-key font-semibold text-fg-muted">{metaFilter.key}</span>
            {metaFilter.value} ×
          </button>
        )}
      </div>
      {allTags.length > 0 && (
        <Toolbar className="tag-filter mb-3 gap-1.5">
          <span className="tag-filter-label text-[12px] text-fg-muted">Filter:</span>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${filterTags.includes(tag.name) ? `tag-chip-active ${tagChipClass('active')}` : tagChipClass('inactive')}`}
              style={tagStyle(tag.name, tag.hue)}
              onClick={() => toggleFilter(tag.name)}
            >
              {tag.name}
              <span className="tag-count text-[11px] opacity-70">
                {tagCounts.get(tag.name) ?? 0}
              </span>
            </button>
          ))}
          {filterTags.length > 0 && (
            <span className="tag-filter-state ml-1.5 inline-flex items-center gap-2 text-[12px] text-fg-muted">
              {filterTags.length > 1 && (
                <span
                  className="filter-mode inline-flex overflow-hidden rounded-full border border-border-subtle"
                  role="group"
                  aria-label="Match mode"
                >
                  <button
                    className={`cursor-pointer rounded-none border-0 bg-transparent px-[9px] py-[2px] text-[11px] font-medium ${filterMode === 'all' ? 'filter-mode-active bg-white/[0.12] text-fg' : 'text-fg-muted'}`}
                    onClick={() => setFilterMode('all')}
                  >
                    all
                  </button>
                  <button
                    className={`cursor-pointer rounded-none border-0 bg-transparent px-[9px] py-[2px] text-[11px] font-medium ${filterMode === 'any' ? 'filter-mode-active bg-white/[0.12] text-fg' : 'text-fg-muted'}`}
                    onClick={() => setFilterMode('any')}
                  >
                    any
                  </button>
                </span>
              )}
              {visibleNotes.length} of {notes.length}
              <button
                className="tag-filter-clear cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#8fa8ff] hover:underline"
                onClick={() => setFilterTags([])}
              >
                Clear
              </button>
            </span>
          )}
        </Toolbar>
      )}
      <ul className="notes-list min-h-0 flex-1 list-none overflow-y-auto p-0">
        {visibleNotes.length === 0 && (
          <li className="notes-empty flex flex-col gap-1 py-[18px] text-[14px] text-fg-muted [&_strong]:font-medium [&_strong]:text-fg">
            {searchActive && searchResults !== null ? (
              <>
                <strong>No notes match “{searchQuery.trim()}”.</strong>
                <span>
                  Search covers titles and content.{' '}
                  <button
                    className="tag-filter-clear cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#8fa8ff] hover:underline"
                    onClick={() => setSearchQuery('')}
                  >
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
                  <button
                    className="tag-filter-clear cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#8fa8ff] hover:underline"
                    onClick={() => setFilterTags([])}
                  >
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
            onTogglePin={async () => {
              await window.api.setPinned(note.id, !note.pinned)
              await refresh()
            }}
            onFilterMeta={(key, value) =>
              setMetaFilter((current) =>
                current && current.key === key && current.value === value ? null : { key, value }
              )
            }
            onUpdate={async (input) => {
              await window.api.updateNote(note.id, input)
              await refresh()
            }}
            onDelete={() => removeNote(note.id, note.title)}
          />
        ))}
      </ul>
    </div>
  )
}

export default Notes
