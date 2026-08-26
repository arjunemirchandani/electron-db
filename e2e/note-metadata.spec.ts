import { test, expect } from './fixtures'

test('note properties can be added, edited, removed, and are validated', async ({ launch }) => {
  const { page } = await launch()
  await page.fill('input[placeholder="Title"]', 'Release checklist')
  await page.click('.notes-form button[type="submit"]')
  const row = page.locator('.note-row')

  // Add two properties through the editor.
  await row.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('button', { name: '+ Property' }).click()
  await page.getByLabel('Property name').fill('priority')
  await page.getByLabel('Property value').fill('high')
  await page.getByRole('button', { name: '+ Property' }).click()
  await page.getByLabel('Property name').nth(1).fill('due')
  await page.getByLabel('Property value').nth(1).fill('2026-09-01')
  await page.locator('.note-edit .button-primary').click()
  await expect(row.locator('.meta-pill')).toHaveText(['priorityhigh', 'due2026-09-01'])

  // Properties survive a relaunch.
  const relaunched = await launch()
  const row2 = relaunched.page.locator('.note-row')
  await expect(row2.locator('.meta-pill')).toHaveText(['priorityhigh', 'due2026-09-01'])

  // Editing a value and removing a property both stick.
  await row2.getByRole('button', { name: 'Edit' }).click()
  await relaunched.page.getByLabel('Property value').first().fill('low')
  await relaunched.page.locator('.meta-remove').nth(1).click()
  await relaunched.page.locator('.note-edit .button-primary').click()
  await expect(row2.locator('.meta-pill')).toHaveText(['prioritylow'])

  // Duplicate keys are refused inline.
  await row2.getByRole('button', { name: 'Edit' }).click()
  await relaunched.page.getByRole('button', { name: '+ Property' }).click()
  await relaunched.page.getByLabel('Property name').nth(1).fill('priority')
  await relaunched.page.locator('.note-edit .button-primary').click()
  await expect(relaunched.page.locator('.note-edit-error')).toContainText('Duplicate property')

  // The main process enforces limits even against a bypassed UI.
  const tooMany = await relaunched.page.evaluate(async () => {
    const id = (await window.api.listNotes())[0].id
    const metadata: Record<string, string> = {}
    for (let i = 0; i < 21; i++) metadata[`k${i}`] = 'v'
    try {
      await window.api.updateNote(id, { title: 'x', metadata })
      return 'accepted'
    } catch (e) {
      return String(e)
    }
  })
  expect(tooMany).toContain('at most 20 properties')

  // Clicking a property pill filters to notes sharing that key/value.
  await relaunched.page.evaluate(async () => {
    const a = await window.api.createNote({ title: 'Also low' })
    await window.api.updateNote(a.id, { title: 'Also low', metadata: { priority: 'low' } })
    const b = await window.api.createNote({ title: 'Unrelated' })
    void b
    location.reload()
  })
  await expect(relaunched.page.locator('.note-row')).toHaveCount(3)
  await relaunched.page.locator('.note-row .meta-pill').first().click()
  await expect(relaunched.page.locator('.note-row')).toHaveCount(2)
  await relaunched.page.locator('.notes-search .meta-pill-active').click()
  await expect(relaunched.page.locator('.note-row')).toHaveCount(3)
})
