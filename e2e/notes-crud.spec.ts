import { test, expect } from './fixtures'

test('creates, lists, and deletes a note', async ({ launch }) => {
  const { page } = await launch()

  await page.fill('input[placeholder="Title"]', 'First note')
  await page.fill('input[placeholder^="Content"]', 'hello sqlite')
  await page.click('.notes-form button[type="submit"]')

  const item = page.locator('.notes-list li', { hasText: 'First note' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('hello sqlite')

  // Newest first: a second note appears above the first.
  await page.fill('input[placeholder="Title"]', 'Second note')
  await page.click('.notes-form button[type="submit"]')
  await expect(page.locator('.note-row').first()).toContainText('Second note')

  // Freshest activity first: editing an older note bumps it to the top.
  // Timestamps are second-granularity; cross the boundary so the edit
  // is strictly newer than the second note's creation.
  await page.waitForTimeout(1100)
  await item.getByRole('button', { name: 'Edit' }).click()
  await page.locator('.note-edit button[type="submit"]').click()
  await expect(page.locator('.note-row').first()).toContainText('First note')

  // Pinned beats freshness: pin the (now lower) second note.
  const second = page.locator('.notes-list li', { hasText: 'Second note' })
  await second.getByRole('button', { name: 'Pin' }).click()
  await expect(page.locator('.note-row').first()).toContainText('Second note')
  await second.getByRole('button', { name: 'Unpin' }).click()
  await expect(page.locator('.note-row').first()).toContainText('First note')

  await page
    .locator('.notes-list li', { hasText: 'Second note' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()

  await item.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(item).toHaveCount(0)
  await expect(page.locator('.notes-empty')).toBeVisible()
})

test('notes persist across app relaunch', async ({ launch }) => {
  const first = await launch()
  await first.page.fill('input[placeholder="Title"]', 'persistent')
  await first.page.click('.notes-form button[type="submit"]')
  await expect(first.page.locator('.notes-list li')).toContainText('persistent')
  await first.app.close()

  const second = await launch()
  await expect(second.page.locator('.notes-list li')).toContainText('persistent')
})
