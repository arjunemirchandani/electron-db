import { ArchiveIcon, NotesIcon, PanelLeftIcon, TagIcon } from './icons'

export type View = 'notes' | 'backups' | 'tags'

const ITEMS: { view: View; label: string; icon: React.JSX.Element }[] = [
  { view: 'notes', label: 'Notes', icon: <NotesIcon size={16} /> },
  { view: 'backups', label: 'Backups', icon: <ArchiveIcon size={16} /> },
  { view: 'tags', label: 'Tags', icon: <TagIcon size={16} /> }
]

interface SidebarProps {
  view: View
  collapsed: boolean
  onSelect: (view: View) => void
  onToggle: () => void
}

function Sidebar({ view, collapsed, onSelect, onToggle }: SidebarProps): React.JSX.Element {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <PanelLeftIcon size={16} />
        </button>
      </div>
      <nav aria-label="Views">
        {ITEMS.map((item) => (
          <button
            key={item.view}
            className={`sidebar-item ${view === item.view ? 'sidebar-item-active' : ''}`}
            data-view={item.view}
            aria-current={view === item.view ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            onClick={() => onSelect(item.view)}
          >
            {item.icon}
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
