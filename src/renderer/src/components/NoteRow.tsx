import type { Note } from '../../../shared/types'
import TagInput from './TagInput'
import { tagChipClass, tagStyle } from '../lib/tagColor'
import { formatFull, formatRelative } from '../lib/time'
import { renderMarked } from '../lib/marked'
import { metaPillClass } from '../lib/pillStyle'
import { IconButton } from './primitives'
import { PencilIcon, PinIcon, TrashIcon } from './icons'

interface NoteRowProps {
  note: Note
  selected: boolean
  tagSuggestions: string[]
  hueFor: (name: string) => number | null | undefined
  addingTag: boolean
  onStartAddTag: () => void
  onCancelAddTag: () => void
  onAddTags: (names: string[]) => void
  onRemoveTag: (tagId: number) => void
  /** Toggle a metadata key/value filter in the parent list. */
  onFilterMeta: (key: string, value: string) => void
  onTogglePin: () => void
  /** Open this note in the detail pane. */
  onSelect: () => void
  onDelete: () => void
}

/** A list item. Viewing and editing happen in the detail pane; the row
 *  keeps quick actions (pin, delete, tags) and selects on click. */
function NoteRow({
  note,
  selected,
  tagSuggestions,
  hueFor,
  addingTag,
  onStartAddTag,
  onCancelAddTag,
  onAddTags,
  onRemoveTag,
  onFilterMeta,
  onTogglePin,
  onSelect,
  onDelete
}: NoteRowProps): React.JSX.Element {
  return (
    <li
      className={`note-row group/row flex cursor-pointer items-start justify-between gap-3 rounded-md border-b border-border-subtle px-2 py-2.5 text-[14px] text-fg transition-colors duration-[120ms] last:border-b-0 ${
        selected ? 'bg-accent/[0.1]' : 'hover:bg-white/[0.035]'
      } @max-[520px]:flex-col @max-[520px]:gap-2 @max-[520px]:py-3`}
      data-note-id={note.id}
      onClick={onSelect}
    >
      <div className="note-main flex min-w-0 flex-auto flex-col gap-1.5">
        <div className="note-title-line [overflow-wrap:anywhere]">
          <strong>
            {note.highlightedTitle ? renderMarked(note.highlightedTitle) : note.title}
          </strong>
          {note.contentSnippet
            ? note.contentSnippet.length > 0 && (
                <span className="note-content text-fg-muted">
                  {' '}
                  — {renderMarked(note.contentSnippet)}
                </span>
              )
            : note.content && <span className="note-content text-fg-muted"> — {note.content}</span>}
        </div>
        <span
          className="note-tags ml-1.5 inline-flex flex-wrap items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className={`tag-chip tag-chip-static ${tagChipClass('static')}`}
              style={tagStyle(tag.name, tag.hue)}
            >
              {tag.name}
              <button
                className="tag-remove cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none text-inherit opacity-0 transition-opacity duration-[120ms] group-hover/chip:opacity-85 group-focus-within/chip:opacity-85 hover:text-white"
                title={`Remove tag ${tag.name}`}
                onClick={() => onRemoveTag(tag.id)}
              >
                ×
              </button>
            </span>
          ))}
          {addingTag ? (
            <TagInput
              className="tag-input-inline min-w-[140px] flex-initial px-1.5 py-[2px] [&_.notes-tags-input]:p-[2px] [&_.notes-tags-input]:text-[13px]"
              value={[]}
              onChange={onAddTags}
              suggestions={tagSuggestions.filter((name) => !note.tags.some((t) => t.name === name))}
              hueFor={hueFor}
              placeholder="Add tag"
              autoFocus
              onDismiss={onCancelAddTag}
            />
          ) : (
            <button
              className="tag-add h-[22px] w-[22px] cursor-pointer rounded-full border border-dashed border-[var(--ev-c-gray-1)] bg-transparent p-0 text-[14px] leading-none text-fg-muted opacity-55 group-hover/row:opacity-100 focus-visible:opacity-100"
              title="Add tag"
              onClick={onStartAddTag}
            >
              +
            </button>
          )}
        </span>
        {Object.keys(note.metadata).length > 0 && (
          <span
            className="note-meta inline-flex flex-wrap gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {Object.entries(note.metadata).map(([key, value]) => (
              <button
                key={key}
                className={`meta-pill ${metaPillClass(false)}`}
                title={`Filter by ${key}: ${value}`}
                onClick={() => onFilterMeta(key, value)}
              >
                <span className="meta-key font-semibold text-fg-muted">{key}</span>
                {value}
              </button>
            ))}
          </span>
        )}
      </div>
      <div
        className="note-foot flex shrink-0 items-center gap-2 @max-[520px]:w-full @max-[520px]:justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <time
          className="notes-date cursor-default text-[12px] whitespace-nowrap text-fg-muted"
          title={formatFull(note.updatedAt ?? note.createdAt)}
        >
          {note.updatedAt
            ? `edited ${formatRelative(note.updatedAt)}`
            : formatRelative(note.createdAt)}
        </time>
        <IconButton
          label={note.pinned ? 'Unpin' : 'Pin'}
          className={note.pinned ? 'pinned text-accent! opacity-100! [&_svg]:fill-current' : ''}
          onClick={onTogglePin}
        >
          <PinIcon />
        </IconButton>
        <IconButton label="Edit" onClick={onSelect}>
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
