import Versions from './components/Versions'
import Notes from './components/Notes'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">ElectronDB</div>
      <div className="text">
        Electron + <span className="react">React</span> + <span className="ts">SQLite</span>
      </div>
      <Notes />
      <Versions></Versions>
    </>
  )
}

export default App
