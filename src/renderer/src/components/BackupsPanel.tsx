import { useState } from 'react'
import type { BackupInfo } from '../../../shared/types'
import { ListRow } from './primitives'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog'

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

interface BackupsPanelProps {
  backups: BackupInfo[]
  onRestore: (filename: string) => Promise<void>
  onDelete: (filename: string) => Promise<void>
}

function BackupsPanel({ backups, onRestore, onDelete }: BackupsPanelProps): React.JSX.Element {
  const [pendingRestore, setPendingRestore] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const when = (filename: string | null): string => {
    const backup = backups.find((b) => b.filename === filename)
    return backup ? new Date(backup.createdAt).toLocaleString() : ''
  }

  const confirmRestore = async (): Promise<void> => {
    if (!pendingRestore) return
    setRestoring(true)
    try {
      await onRestore(pendingRestore)
      setPendingRestore(null)
    } finally {
      setRestoring(false)
    }
  }

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return
    await onDelete(pendingDelete)
    setPendingDelete(null)
  }

  return (
    <div className="backups-panel flex min-h-0 flex-1 flex-col">
      <ul className="backups-list min-h-0 flex-1 list-none overflow-y-auto p-0">
        {backups.length === 0 && (
          <li className="notes-empty flex flex-col gap-1 py-[18px] text-[14px] text-fg-muted [&_strong]:font-medium [&_strong]:text-fg">
            No backups yet.
          </li>
        )}
        {backups.map((backup) => (
          <ListRow
            key={backup.filename}
            main={
              <div className="flex flex-col gap-[2px]">
                <strong>{new Date(backup.createdAt).toLocaleString()}</strong>
                <span className="text-[12px] text-fg-muted">
                  v{backup.appVersion} · {formatSize(backup.sizeBytes)}
                </span>
              </div>
            }
            actions={
              <>
                <button className="btn" onClick={() => setPendingRestore(backup.filename)}>
                  Restore
                </button>
                <button className="btn" onClick={() => setPendingDelete(backup.filename)}>
                  Delete
                </button>
              </>
            }
          />
        ))}
      </ul>

      <AlertDialog
        open={pendingRestore !== null}
        onOpenChange={(open) => !open && !restoring && setPendingRestore(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Current data will be replaced with the {when(pendingRestore)} snapshot. A safety
              snapshot of the current data is taken first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={restoring}>
              {restoring ? 'Restoring…' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              The {when(pendingDelete)} backup file will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default BackupsPanel
