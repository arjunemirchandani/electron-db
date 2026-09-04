import { useRef, useState } from 'react'
import type { Note } from '../../../shared/types'
import { tagChipClass, tagStyle } from '../lib/tagColor'
import { formatFull, formatRelative } from '../lib/time'
import { IconButton } from './primitives'
import { PinIcon, TrashIcon } from './icons'
import MarkdownEditor, { type MarkdownEditorHandle } from './MarkdownEditor'

interface NoteDetailProps {
  note: Note
  onSaved: () => Promise<void>
  onTogglePin: () => void
  onDelete: () => void
  /** Narrow layout only: return to the list. */
  onBack: () => void
}

/** The detail pane: views and edits the selected note. Keyed by note.id
 *  from the parent, so drafts initialize per note without effects.
 *  Class names (.note-edit, .button-primary, labels, .meta-remove)
 *  are the e2e contract carried over from the retired inline editor. */
function NoteDetail({
  note,
  onSaved,
  onTogglePin,
  onDelete,
  onBack
}: NoteDetailProps): React.JSX.Element {
  const [draftTitle, setDraftTitle] = useState(note.title)
  const [draftContent, setDraftContent] = useState(note.content)
  const [draftMeta, setDraftMeta] = useState<Array<{ key: string; value: string }>>(
    Object.entries(note.metadata).map(([key, value]) => ({ key, value }))
  )
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<MarkdownEditorHandle>(null)

  const resetDrafts = (): void => {
    setDraftTitle(note.title)
    setDraftContent(note.content)
    editorRef.current?.setMarkdown(note.content)
    setDraftMeta(Object.entries(note.metadata).map(([key, value]) => ({ key, value })))
    setEditError(null)
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
      await window.api.updateNote(note.id, {
        title: draftTitle,
        content: draftContent,
        metadata: buildMetadata()
      })
      await onSaved()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const onEscape = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') resetDrafts()
  }

  return (
    <div className="note-detail flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn hidden @max-[560px]:inline-flex!"
          type="button"
          onClick={onBack}
          aria-label="Back to list"
        >
          ‹ Notes
        </button>
        <time
          className="notes-date cursor-default text-[12px] whitespace-nowrap text-fg-muted"
          title={formatFull(note.updatedAt ?? note.createdAt)}
        >
          {note.updatedAt
            ? `edited ${formatRelative(note.updatedAt)}`
            : formatRelative(note.createdAt)}
        </time>
        <span className="ml-auto" />
        <IconButton
          label={note.pinned ? 'Unpin' : 'Pin'}
          className={note.pinned ? 'pinned text-accent! opacity-100! [&_svg]:fill-current' : ''}
          onClick={onTogglePin}
        >
          <PinIcon />
        </IconButton>
        <IconButton label="Delete" onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </div>

      {note.tags.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className={`tag-chip tag-chip-static ${tagChipClass('static')}`}
              style={tagStyle(tag.name, tag.hue)}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <form className="note-edit flex min-h-0 flex-1 flex-col gap-2" onSubmit={save}>
        <input
          className="min-w-0 shrink-0 rounded-md border border-border-input bg-surface-input px-2.5 py-2 text-[15px] font-semibold text-fg"
          value={draftTitle}
          placeholder="Title"
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={onEscape}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" onKeyDown={onEscape}>
          <MarkdownEditor ref={editorRef} initial={note.content} onChange={setDraftContent} />
        </div>
        <div className="note-edit-meta flex shrink-0 basis-auto flex-col gap-1.5">
          {draftMeta.map((rowItem, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="min-w-0 flex-[1_1_100px] rounded-sm border border-border-input bg-surface-input px-2 py-[5px] text-[12px] text-fg"
                value={rowItem.key}
                placeholder="Property"
                aria-label="Property name"
                onChange={(e) =>
                  setDraftMeta((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r))
                  )
                }
              />
              <input
                className="min-w-0 flex-[1_1_100px] rounded-sm border border-border-input bg-surface-input px-2 py-[5px] text-[12px] text-fg"
                value={rowItem.value}
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
        <div className="flex shrink-0 items-center gap-2">
          <button type="submit" className="btn button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {editError && (
            <p className="notes-error note-edit-error m-0 text-[13px] text-[#e66]">{editError}</p>
          )}
        </div>
      </form>
    </div>
  )
}

export default NoteDetail
