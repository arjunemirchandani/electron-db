import { useEffect } from 'react'
import Versions from './components/Versions'
import Notes from './components/Notes'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  useEffect(() => {
    document.body.classList.add(`platform-${window.electron.process.platform}`)
  }, [])

  return (
    <>
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
      <Notes />
    </>
  )
}

export default App
