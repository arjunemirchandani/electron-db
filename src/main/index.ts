import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase, closeDatabase, restoreFromBackup, MigrationError } from './db'
import { registerIpcHandlers } from './ipc'
import { initUpdater } from './updater'

// Test hook: lets automated runs point the app at a throwaway data
// directory instead of the real user profile.
if (process.env.ELECTRONDB_USER_DATA) {
  app.setPath('userData', process.env.ELECTRONDB_USER_DATA)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function handleMigrationFailure(error: MigrationError): void {
  const canRestore = error.backupPath !== null
  const buttons = canRestore ? ['Restore Backup & Quit', 'Quit'] : ['Quit']

  // Test hook: automated runs pick a button via env instead of the dialog.
  const forced = process.env.ELECTRONDB_MIGRATION_CHOICE
  const choice = forced
    ? forced === 'restore' && canRestore
      ? 0
      : buttons.length - 1
    : dialog.showMessageBoxSync({
        type: 'error',
        title: 'Database upgrade failed',
        message: 'ElectronDB could not upgrade its database to this version.',
        detail: canRestore
          ? `${error.message}\n\nYour data was backed up before the upgrade attempt. Restoring will return it to its previous state:\n${error.backupPath}`
          : error.message,
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1
      })

  if (canRestore && choice === 0) {
    restoreFromBackup(error.backupPath!)
  }
  app.quit()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.arjunemirchandani.electron-db')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    await initDatabase()
  } catch (error) {
    if (error instanceof MigrationError) {
      handleMigrationFailure(error)
      return
    }
    throw error
  }
  registerIpcHandlers()

  createWindow()

  initUpdater()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
