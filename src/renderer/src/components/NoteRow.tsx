import type { Note } from '../../../shared/types'
import TagInput from './TagInput'
import { tagStyle } from '../lib/tagColor'
import { formatFull, formatRelative } from '../lib/time'
import { IconButton } from './primitives'
import { TrashIcon } from './icons'

interface NoteRowProps {
  note: Note
  tagSuggestions: string[]
  hueFor: (name: string) => number | null | undefined
  addingTag: boolean
  onStartAddTag: () => void
  onCancelAddTag: () => void
  onAddTags: (names: string[]) => void
  onRemoveTag: (tagId: number) => void
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
  onDelete
}: NoteRowProps): React.JSX.Element {
  return (
    <li className="note-row">
      <div className="note-main">
        <div className="note-title-line">
          <strong>{note.title}</strong>
          {note.content && <span className="note-content"> — {note.content}</span>}
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
        <time className="notes-date" title={formatFull(note.createdAt)}>
          {formatRelative(note.createdAt)}
        </time>
        <IconButton label="Delete" onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  )
}

export default NoteRow
