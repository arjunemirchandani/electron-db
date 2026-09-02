import { useCallback, useEffect, useState } from 'react'
import type { BackupInfo } from '../../../shared/types'
import BackupsPanel from './BackupsPanel'
import { Toolbar } from './primitives'
import { toastError, useToast } from './toast-context'

/**
 * Data-lifecycle view: snapshots plus export/import. Self-sufficient — it
 * fetches on mount, and the Notes view refetches when switched back to, so
 * no state needs to thread across views after a restore or import.
 * All action feedback rides the toast channel (successes and failures —
 * these are fire-and-forget actions with no form to sit beside).
 */
function BackupsView(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const toast = useToast()

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
        if (!cancelled) toastError('Could not load backups', String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const message = (err: unknown): string => (err instanceof Error ? err.message : String(err))

  const backupNow = async (): Promise<void> => {
    setBackingUp(true)
    try {
      const path = await window.api.backupNow()
      toast('Backed up', `Saved ${path.split(/[\\/]/).pop()}`)
      await refresh()
    } catch (err) {
      toastError('Backup failed', message(err))
    } finally {
      setBackingUp(false)
    }
  }

  const restoreBackup = async (filename: string): Promise<void> => {
    try {
      await window.api.restoreBackup(filename)
      toast('Restored', filename)
      await refresh()
    } catch (err) {
      toastError('Restore failed', message(err))
      throw err
    }
  }

  const deleteBackup = async (filename: string): Promise<void> => {
    const backup = backups.find((b) => b.filename === filename)
    await window.api.deleteBackup(filename)
    toast(
      'Backup deleted',
      backup ? `${new Date(backup.createdAt).toLocaleString()} snapshot removed` : filename
    )
    await refresh()
  }

  const exportNotes = async (): Promise<void> => {
    try {
      const result = await window.api.exportNotes()
      if (result) {
        toast(`Exported ${result.notes} notes`, `Saved ${result.path.split(/[\\/]/).pop()}`)
      }
    } catch (err) {
      toastError('Export failed', message(err))
    }
  }

  const importNotes = async (): Promise<void> => {
    try {
      const result = await window.api.importNotes()
      if (result) {
        toast(
          `Imported ${result.notes} notes` +
            (result.tagsCreated > 0 ? ` and ${result.tagsCreated} new tags` : ''),
          'A safety snapshot was taken first'
        )
        await refresh()
      }
    } catch (err) {
      toastError('Import failed', message(err))
    }
  }

  return (
    <div className="notes @container flex min-h-0 flex-1 flex-col rounded-lg bg-surface-panel px-6 py-5 backdrop-blur-[9px] view-backups">
      <h2 className="text-[18px] text-fg">Backups</h2>
      <p className="notes-subtitle mb-3.5 text-[13px] text-fg-muted">
        Snapshots, export, and import. Restoring or importing takes a safety snapshot first.
      </p>
      <Toolbar className="notes-backup mb-3 gap-2.5">
        <button className="btn whitespace-nowrap" onClick={backupNow} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Back Up Database'}
        </button>
        <button className="btn export-button whitespace-nowrap" onClick={exportNotes}>
          Export…
        </button>
        <button className="btn import-button whitespace-nowrap" onClick={importNotes}>
          Import…
        </button>
      </Toolbar>
      <BackupsPanel backups={backups} onRestore={restoreBackup} onDelete={deleteBackup} />
    </div>
  )
}

export default BackupsView
