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
