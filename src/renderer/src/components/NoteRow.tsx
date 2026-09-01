import { useState } from 'react'
import type { Note } from '../../../shared/types'
import TagInput from './TagInput'
import { tagChipClass, tagStyle } from '../lib/tagColor'
import { formatFull, formatRelative } from '../lib/time'
import { IconButton } from './primitives'
import { metaPillClass } from '../lib/pillStyle'
import { PencilIcon, TrashIcon } from './icons'

// Search matches arrive wrapped in \u0001…\u0002; render them as <mark>
// elements so note text itself is never treated as markup.
function renderMarked(text: string): React.ReactNode {
  // eslint-disable-next-line no-control-regex -- the markers are deliberately control chars so they can't occur in note text
  const parts = text.split(/\u0001(.*?)\u0002/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-[3px] bg-[hsl(228_65%_60%/0.35)] px-[1px] text-inherit">
        {part}
      </mark>
    ) : (
      part
    )
  )
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
  /** Toggle a metadata key/value filter in the parent list. */
  onFilterMeta: (key: string, value: string) => void
  onUpdate: (input: {
    title: string
    content: string
    metadata: Record<string, string>
  }) => Promise<void>
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
  onFilterMeta,
  onUpdate,
  onDelete
}: NoteRowProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftMeta, setDraftMeta] = useState<Array<{ key: string; value: string }>>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (): void => {
    setDraftTitle(note.title)
    setDraftContent(note.content)
    setDraftMeta(Object.entries(note.metadata).map(([key, value]) => ({ key, value })))
    setEditError(null)
    setEditing(true)
  }

  const buildMetadata = (): Record<string, string> => {
    const metadata: Record<string, string> = {}
    for (const { key, value } of draftMeta) {
      const trimmed = key.trim()
      if (!trimmed) continue
      if (trimmed in metadata) throw new Error(`Duplicate property "${trimmed}"`)
      metadata[trimmed] = value
    }
    return metadata
  }

  const save = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault()
    setSaving(true)
    setEditError(null)
    try {
      await onUpdate({ title: draftTitle, content: draftContent, metadata: buildMetadata() })
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="note-row flex items-start justify-between gap-3 rounded-md border-b border-border-subtle px-2 py-2.5 text-[14px] text-fg transition-colors duration-[120ms] last:border-b-0 hover:bg-white/[0.035] note-row-editing block">
        <form className="note-edit flex flex-wrap gap-2" onSubmit={save}>
          <input
            className="min-w-0 rounded-md border border-border-input bg-surface-input text-fg flex-[1_1_160px] px-2.5 py-2 text-[14px]"
            value={draftTitle}
            autoFocus
            placeholder="Title"
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <input
            className="min-w-0 rounded-md border border-border-input bg-surface-input text-fg flex-[1_1_160px] px-2.5 py-2 text-[14px]"
            value={draftContent}
            placeholder="Content (optional)"
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <div className="note-edit-meta flex basis-full flex-col gap-1.5">
            {draftMeta.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  className="min-w-0 rounded-sm border border-border-input bg-surface-input text-fg flex-[1_1_100px] px-2 py-[5px] text-[12px]"
                  value={row.key}
                  placeholder="Property"
                  aria-label="Property name"
                  onChange={(e) =>
                    setDraftMeta((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r))
                    )
                  }
                />
                <input
                  className="min-w-0 rounded-sm border border-border-input bg-surface-input text-fg flex-[1_1_100px] px-2 py-[5px] text-[12px]"
                  value={row.value}
                  placeholder="Value"
                  aria-label="Property value"
                  onChange={(e) =>
                    setDraftMeta((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r))
                    )
                  }
                />
                <button
                  type="button"
                  className="tag-remove meta-remove cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none text-inherit opacity-70 hover:text-white"
                  title="Remove property"
                  onClick={() => setDraftMeta((rows) => rows.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn meta-add self-start border-dashed bg-transparent px-2.5 py-[3px] text-[12px]"
              onClick={() => setDraftMeta((rows) => [...rows, { key: '', value: '' }])}
            >
              + Property
            </button>
          </div>
          <button type="submit" className="btn button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          {editError && (
            <p className="notes-error note-edit-error m-0 basis-full text-[13px] text-[#e66]">
              {editError}
            </p>
          )}
        </form>
      </li>
    )
  }

  return (
    <li className="note-row flex items-start justify-between gap-3 rounded-md border-b border-border-subtle px-2 py-2.5 text-[14px] text-fg transition-colors duration-[120ms] last:border-b-0 hover:bg-white/[0.035] group/row @max-[520px]:flex-col @max-[520px]:gap-2 @max-[520px]:py-3">
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
        <span className="note-tags ml-1.5 inline-flex flex-wrap items-center gap-1">
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
          <span className="note-meta inline-flex flex-wrap gap-1">
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
      <div className="note-foot flex shrink-0 items-center gap-2 @max-[520px]:w-full @max-[520px]:justify-between">
        <time
          className="notes-date cursor-default text-[12px] whitespace-nowrap text-fg-muted"
          title={formatFull(note.updatedAt ?? note.createdAt)}
        >
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
