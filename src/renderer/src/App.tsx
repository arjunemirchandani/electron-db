import { useEffect, useState } from 'react'
import Versions from './components/Versions'
import Notes from './components/Notes'
import BackupsView from './components/BackupsView'
import TagsView from './components/TagsView'
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
    <>
      <div className="titlebar-drag" aria-hidden="true" />
      <div className="app-shell">
        <Sidebar view={view} collapsed={collapsed} onSelect={setView} onToggle={toggleCollapsed} />
        <main className="app-main">
          <header className="app-header">
            <img alt="logo" className="logo" src={electronLogo} />
            <div className="app-header-text">
              <div className="creator">ElectronDB</div>
              <div className="text">
                Electron + <span className="react">React</span> + <span className="ts">SQLite</span>
              </div>
            </div>
            <Versions></Versions>
          </header>
          {view === 'notes' && <Notes />}
          {view === 'backups' && <BackupsView />}
          {view === 'tags' && <TagsView />}
        </main>
      </div>
    </>
  )
}

export default App
