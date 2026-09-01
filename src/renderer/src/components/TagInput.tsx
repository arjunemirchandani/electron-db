import { forwardRef, useImperativeHandle, useState } from 'react'
import { tagChipClass, tagStyle } from '../lib/tagColor'

export interface TagInputHandle {
  /** Commit any text still in the box as tags and return the full list. */
  flush: () => string[]
}

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  /** Existing tag names offered as autocomplete suggestions. */
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /** Called on Escape, or on blur when nothing is typed. */
  onDismiss?: () => void
  /** Stored hue for a tag name, if the user picked one. */
  hueFor?: (name: string) => number | null | undefined
}

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

const TagInput = forwardRef<TagInputHandle, TagInputProps>(function TagInput(
  { value, onChange, suggestions, placeholder, autoFocus, className, onDismiss, hueFor },
  ref
) {
  const [draft, setDraft] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [open, setOpen] = useState(false)

  const query = draft.trim().toLowerCase()
  const matches = query
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(query) && !value.some((v) => v.toLowerCase() === s.toLowerCase())
      )
    : []

  const add = (names: string[]): string[] => {
    const next = [...value]
    for (const name of names) {
      if (!next.some((v) => v.toLowerCase() === name.toLowerCase())) next.push(name)
    }
    if (next.length !== value.length) onChange(next)
    return next
  }

  const commitDraft = (): string[] => {
    const next = add(parseTags(draft))
    setDraft('')
    setOpen(false)
    return next
  }

  useImperativeHandle(ref, () => ({ flush: commitDraft }))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (open && matches[highlight]) {
        add([matches[highlight]])
        setDraft('')
        setOpen(false)
      } else {
        commitDraft()
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length > 0) {
      e.preventDefault()
      setHighlight((h) => (h - 1 + matches.length) % matches.length)
    } else if (e.key === 'Escape') {
      if (open) setOpen(false)
      else onDismiss?.()
    }
  }

  return (
    <div
      className={`tag-input relative flex min-w-0 flex-wrap items-center gap-[5px] rounded-md border border-border-input bg-surface-input focus-within:border-[rgba(105,136,230,0.75)] ${className ?? ''}`}
    >
      {value.map((name) => (
        <span
          key={name}
          className={`tag-chip tag-chip-static tag-chip-editable ${tagChipClass('static')}`}
          style={tagStyle(name)}
        >
          {name}
          <button
            type="button"
            className="tag-remove cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none text-inherit opacity-0 transition-opacity duration-[120ms] group-hover/chip:opacity-85 group-focus-within/chip:opacity-85 hover:text-white"
            title={`Remove ${name}`}
            onClick={() => onChange(value.filter((v) => v !== name))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="notes-tags-input min-w-0 flex-[1_1_70px] border-0 bg-transparent px-[2px] py-[3px] text-[14px] text-fg outline-none"
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        autoFocus={autoFocus}
        onChange={(e) => {
          setDraft(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false)
          if (draft.trim() === '') onDismiss?.()
        }}
      />
      {open && matches.length > 0 && (
        <ul className="tag-suggestions absolute top-[calc(100%+4px)] left-0 z-10 min-w-[160px] list-none rounded-md border border-border-subtle bg-[rgba(27,27,31,0.96)] p-1 backdrop-blur-[12px]">
          {matches.map((name, i) => (
            <li
              key={name}
              className={`cursor-pointer rounded-[6px] px-1.5 py-1 hover:bg-white/[0.08] ${i === highlight ? 'tag-suggestion-active bg-white/[0.08]' : ''}`}
              // mousedown so the click lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault()
                add([name])
                setDraft('')
                setOpen(false)
              }}
            >
              <span
                className={`tag-chip tag-chip-static ${tagChipClass('static')}`}
                style={tagStyle(name, hueFor?.(name))}
              >
                {name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default TagInput
