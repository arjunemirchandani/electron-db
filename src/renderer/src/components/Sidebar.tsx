import { useEffect, useState } from 'react'
import type { Note, Tag } from '../../../shared/types'
import { tagStyle } from '../lib/tagColor'
import { onTagsChanged } from '../lib/appEvents'
import { ArchiveIcon, GearIcon, NotesIcon, PanelLeftIcon, TagIcon } from './icons'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export type View = 'notes' | 'backups' | 'tags' | 'settings'

// Ordered by expected frequency of use: tags get touched far more
// often than the data-lifecycle chores. Settings sinks to the bottom
// of the rail (mt-auto on its item).
const ITEMS: { view: View; label: string; icon: React.JSX.Element }[] = [
  { view: 'notes', label: 'Notes', icon: <NotesIcon size={16} /> },
  { view: 'tags', label: 'Tags', icon: <TagIcon size={16} /> },
  { view: 'backups', label: 'Backups', icon: <ArchiveIcon size={16} /> },
  { view: 'settings', label: 'Settings', icon: <GearIcon size={16} /> }
]

interface SidebarProps {
  view: View
  collapsed: boolean
  onSelect: (view: View) => void
  onToggle: () => void
  /** Jump to Notes filtered to this tag. */
  onFilterTag: (name: string) => void
}

// State-dependent styling lives in these conditionals, not CSS
// specificity. Below 520px the max-[520px]: variants force the icon
// rail regardless of the collapsed state, preserving the 320px floor.
// `sidebar` / `sidebar-collapsed` / `sidebar-item` stay as bare hooks
// for e2e specs and the focus-visible rule.
// No bg-* here: when two utilities target one property, stylesheet
// order wins (not class order), so background lives only in the
// exclusive active/inactive branches below.
const railButton =
  'cursor-pointer rounded-md border border-transparent transition-[background-color,color] duration-[120ms]'

function Sidebar({
  view,
  collapsed,
  onSelect,
  onToggle,
  onFilterTag
}: SidebarProps): React.JSX.Element {
  const [tags, setTags] = useState<Tag[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  // Views emit tags-changed after any mutating refresh; refetching on
  // that signal (plus view changes, belt and braces) keeps this live.
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      Promise.all([window.api.listTags(), window.api.listNotes()])
        .then(([nextTags, notes]: [Tag[], Note[]]) => {
          if (cancelled) return
          const nextCounts = new Map<string, number>()
          for (const note of notes) {
            for (const tag of note.tags) {
              nextCounts.set(tag.name, (nextCounts.get(tag.name) ?? 0) + 1)
            }
          }
          setTags(nextTags)
          setCounts(nextCounts)
        })
        .catch(() => {})
    }
    load()
    const off = onTagsChanged(load)
    return () => {
      cancelled = true
      off()
    }
  }, [view])

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed w-[52px]' : 'w-[180px]'} flex shrink-0 flex-col gap-2 overflow-hidden rounded-lg bg-surface-panel p-2 backdrop-blur-[9px] transition-[width] duration-[160ms] ease-[ease] max-[520px]:w-[52px]`}
    >
      <div
        className={`flex ${collapsed ? 'justify-center' : 'justify-end'} max-[520px]:justify-center`}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                className={`sidebar-toggle ${railButton} inline-flex h-8 w-8 items-center justify-center bg-transparent p-0 text-fg-muted hover:bg-white/[0.06] hover:text-fg`}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
                onClick={onToggle}
              />
            }
          >
            <PanelLeftIcon size={16} />
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
      <nav className="flex flex-1 flex-col gap-[2px]" aria-label="Views">
        {ITEMS.map((item) => {
          const active = view === item.view
          return (
            <Tooltip key={item.view}>
              <TooltipTrigger
                render={
                  <button
                    className={`sidebar-item ${railButton} flex w-full items-center gap-2.5 py-2 text-[13px] font-semibold whitespace-nowrap [&>svg]:shrink-0 ${
                      active
                        ? 'sidebar-item-active bg-accent/[0.16] text-fg hover:bg-accent/[0.22]'
                        : 'bg-transparent text-fg-muted hover:bg-white/[0.06] hover:text-fg'
                    } ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${
                      item.view === 'settings' ? 'mt-auto' : ''
                    } max-[520px]:justify-center max-[520px]:px-0`}
                    data-view={item.view}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSelect(item.view)}
                  />
                }
              >
                {item.icon}
                <span className={`sidebar-label ${collapsed ? 'hidden' : ''} max-[520px]:hidden`}>
                  {item.label}
                </span>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          )
        })}

        {tags.length > 0 && (
          <div
            className={`sidebar-tags mt-3 flex min-h-0 flex-col border-t border-border-subtle pt-3 ${collapsed ? 'hidden' : ''} max-[520px]:hidden`}
          >
            <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
              Tags
            </div>
            <div className="min-h-0 overflow-y-auto">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`sidebar-tag ${railButton} flex w-full items-center gap-2 bg-transparent px-2.5 py-1.5 text-[12px] text-fg-muted hover:bg-white/[0.06] hover:text-fg`}
                  style={tagStyle(tag.name, tag.hue)}
                  onClick={() => onFilterTag(tag.name)}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--tag-h)_60%_55%)]" />
                  <span className="min-w-0 truncate">{tag.name}</span>
                  <span className="ml-auto text-[11px] opacity-70">
                    {counts.get(tag.name) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
