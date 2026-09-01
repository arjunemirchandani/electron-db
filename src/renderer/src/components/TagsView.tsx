import { useCallback, useEffect, useState } from 'react'
import type { Note, Tag } from '../../../shared/types'
import ManageTags from './ManageTags'

/** Tag management view. Notes are fetched only to show usage counts. */
function TagsView(): React.JSX.Element {
  const [tags, setTags] = useState<Tag[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    const [nextNotes, nextTags] = await Promise.all([window.api.listNotes(), window.api.listTags()])
    setNotes(nextNotes)
    setTags(nextTags)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.listNotes(), window.api.listTags()])
      .then(([nextNotes, nextTags]) => {
        if (cancelled) return
        setNotes(nextNotes)
        setTags(nextTags)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1)
  }

  return (
    <div className="notes @container flex min-h-0 flex-1 flex-col rounded-lg bg-surface-panel px-6 py-5 backdrop-blur-[9px] view-tags">
      <h2 className="text-[18px] text-fg">Tags</h2>
      <p className="notes-subtitle mb-3.5 text-[13px] text-fg-muted">
        Pick colors, rename, merge, or delete — changes apply to every note.
      </p>
      {error && <p className="notes-error mb-2.5 text-[13px] text-[#e66]">{error}</p>}
      <ManageTags tags={tags} counts={counts} onChanged={refresh} />
    </div>
  )
}

export default TagsView
