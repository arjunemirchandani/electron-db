import { test, expect } from './fixtures'

test('notes can be edited inline, with escape to cancel and validation', async ({ launch }) => {
  const { page } = await launch()
  await page.fill('input[placeholder="Title"]', 'Draft title')
  await page.fill('input[placeholder="Content (optional)"]', 'first pass')
  await page.click('.notes-form button[type="submit"]')
  const row = page.locator('.note-row')
  await expect(row).toContainText('Draft title — first pass')
  await expect(row.locator('.notes-date')).toHaveText('just now')

  // Escape cancels without saving.
  await row.getByRole('button', { name: 'Edit' }).click()
  const editTitle = page.locator('.note-edit input').first()
  await expect(editTitle).toHaveValue('Draft title')
  await editTitle.fill('Should not persist')
  await editTitle.press('Escape')
  await expect(row).toContainText('Draft title — first pass')

  // An empty title is refused inline; the editor stays open.
  await row.getByRole('button', { name: 'Edit' }).click()
  await page.locator('.note-edit input').first().fill('')
  await page.locator('.note-edit .button-primary').click()
  await expect(page.locator('.note-edit-error')).toContainText('title is required')

  // A real edit saves, marks the note as edited, and survives relaunch.
  await page.locator('.note-edit input').first().fill('Final title')
  await page.locator('.note-editor .ProseMirror').fill('second pass')
  await page.locator('.note-edit .button-primary').click()
  await expect(row).toContainText('Final title — second pass')
  await expect(row.locator('.notes-date')).toHaveText('edited just now')

  const relaunched = await launch()
  const row2 = relaunched.page.locator('.note-row')
  await expect(row2).toContainText('Final title — second pass')
  await expect(row2.locator('.notes-date')).toContainText('edited')
})
