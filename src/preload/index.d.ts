import { ElectronAPI } from '@electron-toolkit/preload'
import type { DbApi } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: DbApi
  }
}
