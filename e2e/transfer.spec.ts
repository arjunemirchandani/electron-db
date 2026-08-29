import { test, expect } from './fixtures'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('export writes a versioned envelope with tags by name', async ({ launch }) => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'edb-export-')), 'export.json')
  const { page } = await launch({ ELECTRONDB_EXPORT_PATH: out })
  await page.evaluate(async () => {
    const a = await window.api.createNote({ title: 'Sprint', content: 'plan it', tags: ['work'] })
    await window.api.updateNote(a.id, {
      title: 'Sprint',
      content: 'plan it',
      metadata: { priority: 'high' }
    })
    const t = await window.api.listTags()
    await window.api.setTagHue(t[0].id, 210)
    await window.api.createNote({ title: 'Groceries', tags: ['home'] })
    location.reload()
  })
  await expect(page.locator('.note-row')).toHaveCount(2)

  await page.click('.sidebar-item[data-view="backups"]')
  await page.getByRole('button', { name: 'Export…' }).click()
  await expect(page.locator('.backup-status')).toContainText('Exported 2 notes')

  const data = JSON.parse(fs.readFileSync(out, 'utf8'))
  expect(data.format).toBe('electrondb-export')
  expect(data.formatVersion).toBe(1)
  expect(typeof data.appVersion).toBe('string')
  expect(data.tags).toContainEqual({ name: 'work', hue: 210 })
  expect(data.notes).toHaveLength(2)
  const sprint = data.notes.find((n: { title: string }) => n.title === 'Sprint')
  expect(sprint.content).toBe('plan it')
  expect(sprint.metadata).toEqual({ priority: 'high' })
  expect(sprint.tags).toEqual(['work'])
  expect(sprint.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
})

test('import merges a v1 file, preserves existing tag colors, snapshots first', async ({
  launch,
  backups
}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edb-import-'))
  const file = path.join(dir, 'import.json')
  fs.writeFileSync(
    file,
    JSON.stringify({
      format: 'electrondb-export',
      formatVersion: 1,
      exportedAt: '2026-08-27T00:00:00.000Z',
      appVersion: '9.9.9',
      unknownFutureField: { ignored: true },
      tags: [
        { name: 'work', hue: 30 },
        { name: 'travel', hue: 300 }
      ],
      notes: [
        {
          title: 'Imported plans',
          content: 'from another machine',
          createdAt: '2025-01-05 10:00:00',
          updatedAt: null,
          metadata: { origin: 'laptop' },
          tags: ['work', 'travel'],
          unknownField: 42
        },
        { title: 'Minimal note' }
      ]
    })
  )
  const { page } = await launch({ ELECTRONDB_IMPORT_PATH: file })
  // Existing tag with a chosen color: the import must not overwrite it.
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Local note', tags: ['work'] })
    const t = await window.api.listTags()
    await window.api.setTagHue(t[0].id, 210)
    location.reload()
  })
  await expect(page.locator('.note-row')).toHaveCount(1)

  await page.click('.sidebar-item[data-view="backups"]')
  await page.getByRole('button', { name: 'Import…' }).click()
  await expect(page.locator('.backup-status')).toContainText(
    'Imported 2 notes and 1 new tags (snapshot taken first)'
  )
  await page.click('.sidebar-item[data-view="notes"]')
  await expect(page.locator('.note-row')).toHaveCount(3)
  const imported = page.locator('.note-row', { hasText: 'Imported plans' })
  await expect(imported.locator('.tag-chip')).toHaveText(['travel×', 'work×'])
  await expect(imported.locator('.meta-pill')).toHaveText(['originlaptop'])
  await expect(imported.locator('.notes-date')).toHaveAttribute('title', /2025/)
  expect(backups()).toHaveLength(1)

  const hues = await page.evaluate(async () =>
    Object.fromEntries((await window.api.listTags()).map((t) => [t.name, t.hue]))
  )
  expect(hues.work).toBe(210)
  expect(hues.travel).toBe(300)
})

test('import rejects newer or foreign files with honest errors', async ({ launch }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edb-import-bad-'))
  const newer = path.join(dir, 'newer.json')
  fs.writeFileSync(
    newer,
    JSON.stringify({ format: 'electrondb-export', formatVersion: 99, notes: [] })
  )
  const { app, page } = await launch({ ELECTRONDB_IMPORT_PATH: newer })
  await page.click('.sidebar-item[data-view="backups"]')
  await page.getByRole('button', { name: 'Import…' }).click()
  await expect(page.locator('.backup-status')).toContainText(
    'created by a newer version of ElectronDB'
  )
  await page.click('.sidebar-item[data-view="notes"]')
  await expect(page.locator('.note-row')).toHaveCount(0)
  await app.close()

  const foreign = path.join(dir, 'foreign.json')
  fs.writeFileSync(foreign, JSON.stringify({ hello: 'world' }))
  const second = await launch({ ELECTRONDB_IMPORT_PATH: foreign })
  await second.page.click('.sidebar-item[data-view="backups"]')
  await second.page.getByRole('button', { name: 'Import…' }).click()
  await expect(second.page.locator('.backup-status')).toContainText("isn't an ElectronDB export")
})
