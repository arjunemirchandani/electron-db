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
    <div className="backups-panel">
      <ul className="backups-list">
        {backups.length === 0 && <li className="notes-empty">No backups yet.</li>}
        {backups.map((backup) => (
          <ListRow
            key={backup.filename}
            main={
              <div className="backup-meta">
                <strong>{new Date(backup.createdAt).toLocaleString()}</strong>
                <span className="backup-detail">
                  v{backup.appVersion} · {formatSize(backup.sizeBytes)}
                </span>
              </div>
            }
            actions={
              pendingRestore === backup.filename ? (
                <>
                  <span className="backup-confirm-text">Replace current data?</span>
                  <button
                    className="backup-confirm"
                    onClick={() => confirmRestore(backup.filename)}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring…' : 'Confirm'}
                  </button>
                  <button onClick={() => setPendingRestore(null)} disabled={restoring}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setPendingRestore(backup.filename)}>Restore</button>
                  <button onClick={() => onDelete(backup.filename)}>Delete</button>
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
