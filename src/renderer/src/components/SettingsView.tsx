import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/types'
import { useToast } from './toast-context'

const RETENTION_MIN = 1
const RETENTION_MAX = 10

/** App-level preferences. Stored in userData/settings.json, not the
 *  database, so restores and imports never change them. */
function SettingsView(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    window.api
      .getSettings()
      .then((next) => {
        if (!cancelled) setSettings(next)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyRetention = async (value: number): Promise<void> => {
    setError(null)
    try {
      // The main process clamps and returns the sanitized result.
      const next = await window.api.setSettings({ backupRetention: value })
      setSettings(next)
      toast('Saved', `Backups to keep: ${next.backupRetention}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="notes @container flex min-h-0 flex-1 flex-col rounded-lg bg-surface-panel px-6 py-5 backdrop-blur-[9px] view-settings">
      <h2 className="text-[18px] text-fg">Settings</h2>
      <p className="notes-subtitle mb-3.5 text-[13px] text-fg-muted">
        Preferences for this app on this machine — kept outside the database, so restoring a backup
        or importing never changes them.
      </p>
      {error && <p className="notes-error mb-2.5 text-[13px] text-[#e66]">{error}</p>}
      {settings && (
        <div className="settings-row flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle py-3">
          <div className="min-w-0 flex-[1_1_240px]">
            <strong className="text-[14px] text-fg">Backups to keep</strong>
            <p className="mt-[2px] text-[12px] text-fg-muted">
              When a new backup is taken, the oldest ones beyond this count are deleted.
            </p>
          </div>
          <div className="settings-retention flex items-center gap-1.5">
            <button
              className="btn w-[30px] px-0 text-center"
              aria-label="Fewer backups"
              disabled={settings.backupRetention <= RETENTION_MIN}
              onClick={() => applyRetention(settings.backupRetention - 1)}
            >
              −
            </button>
            <input
              className="w-14 rounded-md border border-border-input bg-surface-input px-1 py-1.5 text-center text-[14px] text-fg"
              type="number"
              min={RETENTION_MIN}
              max={RETENTION_MAX}
              value={settings.backupRetention}
              aria-label="Backups to keep"
              onChange={(e) => {
                const value = Number(e.target.value)
                if (Number.isInteger(value) && e.target.value !== '') void applyRetention(value)
              }}
            />
            <button
              className="btn w-[30px] px-0 text-center"
              aria-label="More backups"
              disabled={settings.backupRetention >= RETENTION_MAX}
              onClick={() => applyRetention(settings.backupRetention + 1)}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsView
