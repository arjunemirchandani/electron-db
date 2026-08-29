import { test, expect } from './fixtures'

test('backups view lists, restores (reversibly), and deletes backups', async ({
  launch,
  backups
}) => {
  const { page } = await launch()
  const goto = (view: 'notes' | 'backups'): Promise<void> =>
    page.click(`.sidebar-item[data-view="${view}"]`)
  const addNote = async (title: string): Promise<void> => {
    await page.fill('input[placeholder="Title"]', title)
    await page.click('.notes-form button[type="submit"]')
    await expect(page.locator('.notes-list li', { hasText: title })).toBeVisible()
  }

  await addNote('before snapshot')
  await goto('backups')
  await page.click('.notes-backup button:has-text("Back Up Database")')
  await expect(page.locator('.backup-status')).toContainText('Backed up to')
  await expect(page.locator('.backups-list .list-row')).toHaveCount(1)

  await goto('notes')
  await addNote('after snapshot')
  await expect(page.locator('.notes-list li')).toHaveCount(2)

  // Restore is a two-step confirm; cancelling changes nothing.
  await goto('backups')
  const row = page.locator('.backups-list .list-row').first()
  await row.getByRole('button', { name: 'Restore' }).click()
  await expect(row.locator('.backup-confirm-text')).toBeVisible()
  await row.getByRole('button', { name: 'Cancel' }).click()
  await goto('notes')
  await expect(page.locator('.notes-list li')).toHaveCount(2)

  // Confirming rolls the data back to the snapshot...
  await goto('backups')
  await row.getByRole('button', { name: 'Restore' }).click()
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('.backup-status')).toContainText('Restored')

  // ...and a safety snapshot of the pre-restore state was taken first.
  await expect(page.locator('.backups-list .list-row')).toHaveCount(2)
  expect(backups()).toHaveLength(2)

  // Switching back to Notes refetches; the rollback is visible.
  await goto('notes')
  await expect(page.locator('.notes-list li')).toHaveCount(1)
  await expect(page.locator('.notes-list li')).toContainText('before snapshot')

  // The restored state survives a relaunch (the file swap really happened).
  const relaunched = await launch()
  await expect(relaunched.page.locator('.notes-list li')).toHaveCount(1)
  await expect(relaunched.page.locator('.notes-list li')).toContainText('before snapshot')

  // Delete removes the file.
  await relaunched.page.click('.sidebar-item[data-view="backups"]')
  await relaunched.page
    .locator('.backups-list .list-row')
    .first()
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(relaunched.page.locator('.backups-list .list-row')).toHaveCount(1)
  expect(backups()).toHaveLength(1)
})
