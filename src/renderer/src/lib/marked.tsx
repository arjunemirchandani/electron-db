import type { ReactNode } from 'react'

/** Search matches arrive wrapped in \u0001…\u0002; render them as
 *  <mark> elements so note text itself is never treated as markup.
 *  Shared by NoteRow and the command palette. */
export function renderMarked(text: string): ReactNode {
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
