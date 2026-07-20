import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type LaunchFn } from './fixtures'

const GOOD_MIGRATION = 'CREATE TABLE `e2e_probe` (`id` integer PRIMARY KEY NOT NULL);\n'
const BAD_MIGRATION = 'ALTER TABLE `does_not_exist` ADD `boom` text;\n'

async function addNote(launch: LaunchFn): Promise<void> {
  const { app, page } = await launch()
  await page.fill('input[placeholder="Title"]', 'survivor')
  await page.click('.notes-form button[type="submit"]')
  await expect(page.locator('.notes-list li')).toContainText('survivor')
  await app.close()
}

test('fresh install creates the database without a backup', async ({
  launch,
  backups,
  userDataDir
}) => {
  await launch()
  expect(fs.existsSync(path.join(userDataDir, 'electrondb.sqlite3'))).toBe(true)
  expect(backups()).toHaveLength(0)
})

test('pending migration backs up once and preserves data', async ({
  launch,
  backups,
  stageMigration
}) => {
  await addNote(launch)

  const env = { ELECTRONDB_MIGRATIONS_DIR: stageMigration(GOOD_MIGRATION) }
  const upgraded = await launch(env)
  await expect(upgraded.page.locator('.notes-list li')).toContainText('survivor')
  expect(backups()).toHaveLength(1)
  await upgraded.app.close()

  // Relaunching with no pending work must not create a second backup.
  const relaunched = await launch(env)
  await expect(relaunched.page.locator('.notes-list li')).toContainText('survivor')
  expect(backups()).toHaveLength(1)
})

test('failed migration with quit choice leaves the database untouched', async ({
  launch,
  runToExit,
  backups,
  stageMigration
}) => {
  await addNote(launch)

  const result = runToExit({
    ELECTRONDB_MIGRATIONS_DIR: stageMigration(BAD_MIGRATION),
    ELECTRONDB_MIGRATION_CHOICE: 'quit'
  })
  expect(result.status).toBe(0)
  expect(result.stdout + result.stderr).toContain('migration failed')
  expect(backups()).toHaveLength(1)

  // Back on the original migrations (the "hotfix"), the app is healthy.
  const recovered = await launch()
  await expect(recovered.page.locator('.notes-list li')).toContainText('survivor')
})

test('failed migration with restore choice recovers from backup', async ({
  launch,
  runToExit,
  backups,
  stageMigration,
  userDataDir
}) => {
  await addNote(launch)

  const result = runToExit({
    ELECTRONDB_MIGRATIONS_DIR: stageMigration(BAD_MIGRATION),
    ELECTRONDB_MIGRATION_CHOICE: 'restore'
  })
  expect(result.status).toBe(0)
  expect(result.stdout + result.stderr).toContain('restored database from')
  expect(backups()).toHaveLength(1)
  // Restore must clean up WAL/SHM left behind by the failed database.
  expect(fs.existsSync(path.join(userDataDir, 'electrondb.sqlite3-wal'))).toBe(false)
  expect(fs.existsSync(path.join(userDataDir, 'electrondb.sqlite3-shm'))).toBe(false)

  const recovered = await launch()
  await expect(recovered.page.locator('.notes-list li')).toContainText('survivor')
})
