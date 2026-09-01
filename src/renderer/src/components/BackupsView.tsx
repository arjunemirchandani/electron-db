import { useCallback, useEffect, useState } from 'react'
import type { BackupInfo } from '../../../shared/types'
import BackupsPanel from './BackupsPanel'
import { Toolbar } from './primitives'

/**
 * Data-lifecycle view: snapshots plus export/import. Self-sufficient — it
 * fetches on mount, and the Notes view refetches when switched back to, so
 * no state needs to thread across views after a restore or import.
 */
function BackupsView(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setBackups(await window.api.listBackups())
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api
      .listBackups()
      .then((next) => {
        if (!cancelled) setBackups(next)
      })
      .catch((e) => {
        if (!cancelled) setStatus(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const backupNow = async (): Promise<void> => {
    setBackingUp(true)
    setStatus(null)
    try {
      const path = await window.api.backupNow()
      const filename = path.split(/[\\/]/).pop()
      setStatus(`Backed up to ${filename}`)
      await refresh()
    } catch (err) {
      setStatus(`Backup failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBackingUp(false)
    }
  }

  const restoreBackup = async (filename: string): Promise<void> => {
    setStatus(null)
    try {
      await window.api.restoreBackup(filename)
      setStatus(`Restored ${filename}`)
      await refresh()
    } catch (err) {
      setStatus(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }

  const deleteBackup = async (filename: string): Promise<void> => {
    await window.api.deleteBackup(filename)
    await refresh()
  }

  const exportNotes = async (): Promise<void> => {
    setStatus(null)
    try {
      const result = await window.api.exportNotes()
      if (result) {
        setStatus(`Exported ${result.notes} notes to ${result.path.split(/[\\/]/).pop()}`)
      }
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const importNotes = async (): Promise<void> => {
    setStatus(null)
    try {
      const result = await window.api.importNotes()
      if (result) {
        setStatus(
          `Imported ${result.notes} notes` +
            (result.tagsCreated > 0 ? ` and ${result.tagsCreated} new tags` : '') +
            ' (snapshot taken first)'
        )
        await refresh()
      }
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="notes view-backups">
      <h2>Backups</h2>
      <p className="notes-subtitle">
        Snapshots, export, and import. Restoring or importing takes a safety snapshot first.
      </p>
      <Toolbar className="notes-backup">
        <button className="btn" onClick={backupNow} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Back Up Database'}
        </button>
        <button className="btn export-button" onClick={exportNotes}>
          Export…
        </button>
        <button className="btn import-button" onClick={importNotes}>
          Import…
        </button>
        {status && <span className="backup-status">{status}</span>}
      </Toolbar>
      <BackupsPanel backups={backups} onRestore={restoreBackup} onDelete={deleteBackup} />
    </div>
  )
}

export default BackupsView
