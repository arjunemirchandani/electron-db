import { useState } from 'react'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul className="versions inline-flex flex-col gap-[7px] overflow-hidden rounded-[14px] bg-[#202127] py-2.5 font-mono backdrop-blur-[24px] max-[620px]:hidden">
      <li className="electron-version block px-3.5 text-[10px] leading-[10px] opacity-80">
        Electron v{versions.electron}
      </li>
      <li className="chrome-version block px-3.5 text-[10px] leading-[10px] opacity-80">
        Chromium v{versions.chrome}
      </li>
      <li className="node-version block px-3.5 text-[10px] leading-[10px] opacity-80">
        Node v{versions.node}
      </li>
    </ul>
  )
}

export default Versions
