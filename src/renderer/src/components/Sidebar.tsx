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

function Sidebar({ view, collapsed, onSelect, onToggle }: SidebarProps): React.JSX.Element {
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
      </nav>
    </aside>
  )
}

export default Sidebar
