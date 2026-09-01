import { useState } from 'react'
import type { Tag } from '../../../shared/types'
import { tagChipClass, tagStyle } from '../lib/tagColor'
import { ListRow } from './primitives'

const PALETTE = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

interface ManageTagsProps {
  tags: Tag[]
  counts: Map<string, number>
  /** Called after any change so the parent reloads notes and tags. */
  onChanged: () => Promise<void>
}

function ManageTags({ tags, counts, onChanged }: ManageTagsProps): React.JSX.Element {
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [mergingId, setMergingId] = useState<number | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>): Promise<void> => {
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const startRename = (tag: Tag): void => {
    setRenamingId(tag.id)
    setRenameDraft(tag.name)
    setMergingId(null)
    setPendingDeleteId(null)
  }

  const commitRename = async (tag: Tag): Promise<void> => {
    const name = renameDraft.trim()
    if (!name || name === tag.name) {
      setRenamingId(null)
      return
    }
    // Leave edit mode either way; a refused rename shows its error above the list.
    await run(() => window.api.renameTag(tag.id, name))
    setRenamingId(null)
  }

  const renderMain = (tag: Tag): React.JSX.Element => (
    <>
      {renamingId === tag.id ? (
        <input
          className="manage-tag-rename w-[140px] rounded-full border border-border-input bg-surface-input px-2 py-[3px] text-[12px] text-fg"
          value={renameDraft}
          autoFocus
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitRename(tag)
            if (e.key === 'Escape') setRenamingId(null)
          }}
          onBlur={() => void commitRename(tag)}
        />
      ) : (
        <span className={`tag-chip tag-chip-static ${tagChipClass('static')}`} style={tagStyle(tag.name, tag.hue)}>
          {tag.name}
          <span className="tag-count text-[11px] opacity-70">{counts.get(tag.name) ?? 0}</span>
        </span>
      )}
      <span className="manage-tag-palette inline-flex flex-wrap items-center gap-1" role="group" aria-label={`Color for ${tag.name}`}>
        {PALETTE.map((hue) => (
          <button
            key={hue}
            className={`swatch h-4 w-4 shrink-0 cursor-pointer rounded-full border-2 bg-[hsl(var(--tag-h)_60%_55%)] p-0 text-[9px] leading-none text-fg-muted ${tag.hue === hue ? 'swatch-active border-white' : 'border-transparent'}`}
            style={{ '--tag-h': hue } as React.CSSProperties}
            title={`Hue ${hue}`}
            onClick={() => run(() => window.api.setTagHue(tag.id, hue))}
          />
        ))}
        <button
          className={`swatch swatch-auto h-4 w-4 shrink-0 cursor-pointer rounded-full border-2 bg-transparent p-0 text-[9px] leading-none text-fg-muted ${tag.hue === null ? 'swatch-active border-white' : 'border-[var(--ev-c-gray-1)]'}`}
          title="Automatic color"
          onClick={() => run(() => window.api.setTagHue(tag.id, null))}
        >
          A
        </button>
      </span>
    </>
  )

  const renderActions = (tag: Tag): React.JSX.Element => {
    if (mergingId === tag.id) {
      return (
        <>
          <span className="backup-confirm-text mr-1 text-[12px] text-[#e6b366]">Merge into</span>
          <select
            className="manage-tag-select rounded-md border border-border-subtle bg-[rgba(27,27,31,0.9)] px-1.5 py-1 text-[12px] text-fg"
            value={mergeTargetId ?? ''}
            onChange={(e) => setMergeTargetId(Number(e.target.value))}
          >
            <option value="" disabled>
              choose…
            </option>
            {tags
              .filter((t) => t.id !== tag.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <button
            className="btn backup-confirm"
            disabled={mergeTargetId === null}
            onClick={() =>
              run(async () => {
                await window.api.mergeTags(tag.id, mergeTargetId!)
                setMergingId(null)
                setMergeTargetId(null)
              })
            }
          >
            Confirm
          </button>
          <button className="btn" onClick={() => setMergingId(null)}>
            Cancel
          </button>
        </>
      )
    }
    if (pendingDeleteId === tag.id) {
      return (
        <>
          <span className="backup-confirm-text mr-1 text-[12px] text-[#e6b366]">Remove from all notes?</span>
          <button
            className="btn backup-confirm"
            onClick={() =>
              run(async () => {
                await window.api.deleteTag(tag.id)
                setPendingDeleteId(null)
              })
            }
          >
            Confirm
          </button>
          <button className="btn" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </button>
        </>
      )
    }
    return (
      <>
        <button className="btn" onClick={() => startRename(tag)}>
          Rename
        </button>
        <button
          className="btn"
          disabled={tags.length < 2}
          onClick={() => {
            setMergingId(tag.id)
            setMergeTargetId(null)
            setRenamingId(null)
            setPendingDeleteId(null)
          }}
        >
          Merge
        </button>
        <button className="btn" onClick={() => setPendingDeleteId(tag.id)}>
          Delete
        </button>
      </>
    )
  }

  return (
    <div className="manage-tags flex min-h-0 flex-1 flex-col">
      {error && <p className="notes-error mb-2.5 text-[13px] text-[#e66]">{error}</p>}
      {tags.length === 0 && <p className="notes-empty flex flex-col gap-1 py-[18px] text-[14px] text-fg-muted [&_strong]:font-medium [&_strong]:text-fg">No tags yet.</p>}
      <ul className="manage-tags-list min-h-0 flex-1 list-none overflow-y-auto p-0">
        {tags.map((tag) => (
          <ListRow key={tag.id} main={renderMain(tag)} actions={renderActions(tag)} />
        ))}
      </ul>
    </div>
  )
}

export default ManageTags
