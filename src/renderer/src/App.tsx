import { useEffect, useState } from 'react'
import Versions from './components/Versions'
import Notes from './components/Notes'
import BackupsView from './components/BackupsView'
import TagsView from './components/TagsView'
import Sidebar, { type View } from './components/Sidebar'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('notes')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.body.classList.add(`platform-${window.electron.process.platform}`)
  }, [])

  return (
    <>
      <div className="titlebar-drag" aria-hidden="true" />
      <div className="app-shell">
        <Sidebar
          view={view}
          collapsed={collapsed}
          onSelect={setView}
          onToggle={() => setCollapsed((v) => !v)}
        />
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
