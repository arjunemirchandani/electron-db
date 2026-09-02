import { useEffect, useState } from 'react'
import Versions from './components/Versions'
import Notes from './components/Notes'
import BackupsView from './components/BackupsView'
import TagsView from './components/TagsView'
import SettingsView from './components/SettingsView'
import CommandPalette from './components/CommandPalette'
import { Toaster } from './components/ui/toast'
import { TooltipProvider } from './components/ui/tooltip'
import Sidebar, { type View } from './components/Sidebar'
import electronLogo from './assets/electron.svg'

const SIDEBAR_KEY = 'electrondb.sidebarCollapsed'

// localStorage lives in userData, so the preference survives relaunches;
// reads and writes are guarded because storage can be unavailable.
const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('notes')
  const [revealNoteId, setRevealNoteId] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = (): void =>
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // storage unavailable — the toggle still works for this session
      }
      return next
    })

  useEffect(() => {
    document.body.classList.add(`platform-${window.electron.process.platform}`)
  }, [])

  return (
    <Toaster>
      <TooltipProvider>
        <div className="titlebar-drag" aria-hidden="true" />
        <div className="app-shell flex min-h-0 flex-1 items-stretch gap-4 max-[520px]:gap-2.5">
          <Sidebar
            view={view}
            collapsed={collapsed}
            onSelect={setView}
            onToggle={toggleCollapsed}
          />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <header className="app-header flex flex-wrap items-center gap-x-5 gap-y-2">
              <img
                alt="logo"
                className="logo h-[72px] w-[72px] transition-[filter] duration-300 will-change-[filter] [-webkit-user-drag:none] hover:drop-shadow-[0_0_1.2em_#6988e6aa]"
                src={electronLogo}
              />
              <div className="flex-1">
                <div className="mb-1 text-[13px] leading-4 font-semibold text-fg-muted">
                  ElectronDB
                </div>
                <div className="text-[19px] leading-6 font-bold text-fg min-[400px]:whitespace-nowrap max-[720px]:text-[20px]">
                  Electron +{' '}
                  <span className="bg-[linear-gradient(135deg,#087ea4_55%,#7c93ee)] bg-clip-text font-bold text-transparent">
                    React
                  </span>{' '}
                  +{' '}
                  <span className="bg-[linear-gradient(135deg,#3178c6_45%,#f0dc4e)] bg-clip-text font-bold text-transparent">
                    SQLite
                  </span>
                </div>
              </div>
              <Versions></Versions>
            </header>
            {view === 'notes' && (
              <Notes revealNoteId={revealNoteId} onRevealHandled={() => setRevealNoteId(null)} />
            )}
            {view === 'backups' && <BackupsView />}
            {view === 'tags' && <TagsView />}
            {view === 'settings' && <SettingsView />}
          </main>
        </div>
        <CommandPalette
          onNavigate={setView}
          onRevealNote={(id) => {
            setView('notes')
            setRevealNoteId(id)
          }}
        />
      </TooltipProvider>
    </Toaster>
  )
}

export default App
