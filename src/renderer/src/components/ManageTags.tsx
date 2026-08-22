import { useState } from 'react'
import type { Tag } from '../../../shared/types'
import { tagStyle } from '../lib/tagColor'

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

  return (
    <div className="manage-tags">
      {error && <p className="notes-error">{error}</p>}
      {tags.length === 0 && <p className="notes-empty">No tags yet.</p>}
      <ul className="manage-tags-list">
        {tags.map((tag) => (
          <li key={tag.id}>
            <div className="manage-tag-main">
              {renamingId === tag.id ? (
                <input
                  className="manage-tag-rename"
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
                <span className="tag-chip tag-chip-static" style={tagStyle(tag.name, tag.hue)}>
                  {tag.name}
                  <span className="tag-count">{counts.get(tag.name) ?? 0}</span>
                </span>
              )}
              <span
                className="manage-tag-palette"
                role="group"
                aria-label={`Color for ${tag.name}`}
              >
                {PALETTE.map((hue) => (
                  <button
                    key={hue}
                    className={`swatch ${tag.hue === hue ? 'swatch-active' : ''}`}
                    style={{ '--tag-h': hue } as React.CSSProperties}
                    title={`Hue ${hue}`}
                    onClick={() => run(() => window.api.setTagHue(tag.id, hue))}
                  />
                ))}
                <button
                  className={`swatch swatch-auto ${tag.hue === null ? 'swatch-active' : ''}`}
                  title="Automatic color"
                  onClick={() => run(() => window.api.setTagHue(tag.id, null))}
                >
                  A
                </button>
              </span>
            </div>
            <div className="backup-actions">
              {mergingId === tag.id ? (
                <>
                  <span className="backup-confirm-text">Merge into</span>
                  <select
                    className="manage-tag-select"
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
                    className="backup-confirm"
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
                  <button onClick={() => setMergingId(null)}>Cancel</button>
                </>
              ) : pendingDeleteId === tag.id ? (
                <>
                  <span className="backup-confirm-text">Remove from all notes?</span>
                  <button
                    className="backup-confirm"
                    onClick={() =>
                      run(async () => {
                        await window.api.deleteTag(tag.id)
                        setPendingDeleteId(null)
                      })
                    }
                  >
                    Confirm
                  </button>
                  <button onClick={() => setPendingDeleteId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => startRename(tag)}>Rename</button>
                  <button
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
                  <button onClick={() => setPendingDeleteId(tag.id)}>Delete</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ManageTags
