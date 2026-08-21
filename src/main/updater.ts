import { app, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'

const RELEASES_URL = 'https://github.com/arjunemirchandani/electron-db/releases'
const LATEST_RELEASE_API =
  'https://api.github.com/repos/arjunemirchandani/electron-db/releases/latest'

function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number)
  const b = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

// Test hook: ELECTRONDB_UPDATE_CHOICE auto-answers the update dialogs
// (the same pattern as ELECTRONDB_MIGRATION_CHOICE for migration failures).
function forcedChoice(acceptValue: string): number | null {
  const forced = process.env.ELECTRONDB_UPDATE_CHOICE
  if (!forced) return null
  return forced === acceptValue ? 0 : 1
}

// macOS auto-update requires a code-signed app, and this template ships
// unsigned by design — so on macOS we check GitHub for a newer release and
// point the user at the download page instead. A downstream app that adds
// signing can delete this branch and use electron-updater everywhere.
async function checkForUpdateViaGitHub(): Promise<void> {
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      headers: { accept: 'application/vnd.github+json' }
    })
    if (!res.ok) return
    const release = (await res.json()) as { tag_name?: string }
    const latest = release.tag_name?.replace(/^v/, '')
    if (!latest || !isNewer(latest, app.getVersion())) {
      console.log(`[updater] up to date (v${app.getVersion()})`)
      return
    }
    console.log(`[updater] update available: v${latest}`)
    const choice =
      forcedChoice('open') ??
      dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update available',
        message: `ElectronDB v${latest} is available (you have v${app.getVersion()}).`,
        detail: 'Download the latest version from the releases page.',
        buttons: ['Open Releases Page', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
    if (choice === 0) await shell.openExternal(RELEASES_URL)
  } catch (error) {
    // Update checks must never bother the user on failure (offline, rate limit).
    console.log('[updater] check failed:', error instanceof Error ? error.message : error)
  }
}

function setupAutoUpdater(): void {
  autoUpdater.on('error', (error) => console.log('[updater]', error.message))
  autoUpdater.on('update-available', (info) =>
    console.log(`[updater] update available: v${info.version}, downloading`)
  )
  autoUpdater.on('update-downloaded', (info) => {
    const choice =
      forcedChoice('install') ??
      dialog.showMessageBoxSync({
        type: 'info',
        title: 'Update ready',
        message: `ElectronDB v${info.version} has been downloaded.`,
        detail: 'Restart the app to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
    if (choice === 0) autoUpdater.quitAndInstall()
  })
  void autoUpdater
    .checkForUpdates()
    .catch((error) => console.log('[updater]', error instanceof Error ? error.message : error))
}

export function initUpdater(): void {
  // Inert in dev unless a test explicitly opts in.
  if (!app.isPackaged && !process.env.ELECTRONDB_FORCE_UPDATE_CHECK) return

  if (process.platform === 'darwin') {
    void checkForUpdateViaGitHub()
  } else {
    // Windows (NSIS) and Linux (AppImage) auto-update from GitHub Releases.
    // A deb/apt install can't self-update; electron-updater reports it via
    // the error handler and the app carries on.
    setupAutoUpdater()
  }
}
