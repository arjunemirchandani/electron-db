import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DbApi, NewNoteInput } from '../shared/types'

// Custom APIs for renderer
const api: DbApi = {
  listNotes: () => ipcRenderer.invoke('notes:list'),
  createNote: (input: NewNoteInput) => ipcRenderer.invoke('notes:create', input),
  updateNote: (id: number, input: { title: string; content?: string }) =>
    ipcRenderer.invoke('notes:update', id, input),
  searchNotes: (query: string) => ipcRenderer.invoke('notes:search', query),
  deleteNote: (id: number) => ipcRenderer.invoke('notes:delete', id),
  listTags: () => ipcRenderer.invoke('tags:list'),
  addTag: (noteId: number, name: string) => ipcRenderer.invoke('tags:add', noteId, name),
  removeTag: (noteId: number, tagId: number) => ipcRenderer.invoke('tags:remove', noteId, tagId),
  setTagHue: (tagId: number, hue: number | null) => ipcRenderer.invoke('tags:setHue', tagId, hue),
  renameTag: (tagId: number, name: string) => ipcRenderer.invoke('tags:rename', tagId, name),
  mergeTags: (sourceId: number, targetId: number) =>
    ipcRenderer.invoke('tags:merge', sourceId, targetId),
  deleteTag: (tagId: number) => ipcRenderer.invoke('tags:delete', tagId),
  backupNow: () => ipcRenderer.invoke('db:backup'),
  listBackups: () => ipcRenderer.invoke('backups:list'),
  restoreBackup: (filename: string) => ipcRenderer.invoke('backups:restore', filename),
  deleteBackup: (filename: string) => ipcRenderer.invoke('backups:delete', filename)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
