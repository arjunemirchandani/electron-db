import { useState } from 'react'
import type { BackupInfo } from '../../../shared/types'
import { ListRow } from './primitives'

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
  const [restoring, setRestoring] = useState(false)

  const confirmRestore = async (filename: string): Promise<void> => {
    setRestoring(true)
    try {
      await onRestore(filename)
      setPendingRestore(null)
    } finally {
      setRestoring(false)
    }
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
              pendingRestore === backup.filename ? (
                <>
                  <span className="backup-confirm-text mr-1 text-[12px] text-[#e6b366]">
                    Replace current data?
                  </span>
                  <button
                    className="btn backup-confirm"
                    onClick={() => confirmRestore(backup.filename)}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring…' : 'Confirm'}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setPendingRestore(null)}
                    disabled={restoring}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => setPendingRestore(backup.filename)}>
                    Restore
                  </button>
                  <button className="btn" onClick={() => onDelete(backup.filename)}>
                    Delete
                  </button>
                </>
              )
            }
          />
        ))}
      </ul>
    </div>
  )
}

export default BackupsPanel
