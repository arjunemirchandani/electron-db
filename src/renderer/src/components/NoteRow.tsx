import { useState } from 'react'
import type { Note } from '../../../shared/types'
import TagInput from './TagInput'
import { tagStyle } from '../lib/tagColor'
import { formatFull, formatRelative } from '../lib/time'
import { IconButton } from './primitives'
import { PencilIcon, TrashIcon } from './icons'

// Search matches arrive wrapped in \u0001…\u0002; render them as <mark>
// elements so note text itself is never treated as markup.
function renderMarked(text: string): React.ReactNode {
  // eslint-disable-next-line no-control-regex -- the markers are deliberately control chars so they can't occur in note text
  const parts = text.split(/\u0001(.*?)\u0002/g)
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}

interface NoteRowProps {
  note: Note
  tagSuggestions: string[]
  hueFor: (name: string) => number | null | undefined
  addingTag: boolean
  onStartAddTag: () => void
  onCancelAddTag: () => void
  onAddTags: (names: string[]) => void
  onRemoveTag: (tagId: number) => void
  onUpdate: (input: { title: string; content: string }) => Promise<void>
  onDelete: () => void
}

function NoteRow({
  note,
  tagSuggestions,
  hueFor,
  addingTag,
  onStartAddTag,
  onCancelAddTag,
  onAddTags,
  onRemoveTag,
  onUpdate,
  onDelete
}: NoteRowProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (): void => {
    setDraftTitle(note.title)
    setDraftContent(note.content)
    setEditError(null)
    setEditing(true)
  }

  const save = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault()
    setSaving(true)
    setEditError(null)
    try {
      await onUpdate({ title: draftTitle, content: draftContent })
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="note-row note-row-editing">
        <form className="note-edit" onSubmit={save}>
          <input
            value={draftTitle}
            autoFocus
            placeholder="Title"
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <input
            value={draftContent}
            placeholder="Content (optional)"
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          {editError && <p className="notes-error note-edit-error">{editError}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="note-row">
      <div className="note-main">
        <div className="note-title-line">
          <strong>
            {note.highlightedTitle ? renderMarked(note.highlightedTitle) : note.title}
          </strong>
          {note.contentSnippet
            ? note.contentSnippet.length > 0 && (
                <span className="note-content"> — {renderMarked(note.contentSnippet)}</span>
              )
            : note.content && <span className="note-content"> — {note.content}</span>}
        </div>
        <span className="note-tags">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="tag-chip tag-chip-static"
              style={tagStyle(tag.name, tag.hue)}
            >
              {tag.name}
              <button
                className="tag-remove"
                title={`Remove tag ${tag.name}`}
                onClick={() => onRemoveTag(tag.id)}
              >
                ×
              </button>
            </span>
          ))}
          {addingTag ? (
            <TagInput
              className="tag-input-inline"
              value={[]}
              onChange={onAddTags}
              suggestions={tagSuggestions.filter((name) => !note.tags.some((t) => t.name === name))}
              hueFor={hueFor}
              placeholder="Add tag"
              autoFocus
              onDismiss={onCancelAddTag}
            />
          ) : (
            <button className="tag-add" title="Add tag" onClick={onStartAddTag}>
              +
            </button>
          )}
        </span>
      </div>
      <div className="note-foot">
        <time className="notes-date" title={formatFull(note.updatedAt ?? note.createdAt)}>
          {note.updatedAt
            ? `edited ${formatRelative(note.updatedAt)}`
            : formatRelative(note.createdAt)}
        </time>
        <IconButton label="Edit" onClick={startEdit}>
          <PencilIcon />
        </IconButton>
        <IconButton label="Delete" onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  )
}

export default NoteRow
