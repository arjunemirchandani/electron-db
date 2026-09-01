import { test, expect } from './fixtures'

test('notes can be tagged, filtered, and untagged with orphan pruning', async ({ launch }) => {
  const { page } = await launch()

  const addNote = async (title: string, tagsCsv: string): Promise<void> => {
    await page.fill('input[placeholder="Title"]', title)
    await page.fill('.notes-tags-input', tagsCsv)
    await page.click('.notes-form button[type="submit"]')
    await expect(page.locator('.notes-list li', { hasText: title })).toBeVisible()
  }

  await addNote('Plan sprint', 'work, planning')
  await addNote('Water plants', 'home')

  // Tag chips render on the note rows and in the filter bar.
  const sprintRow = page.locator('.notes-list li', { hasText: 'Plan sprint' })
  await expect(sprintRow.locator('.tag-chip')).toHaveText(['planning×', 'work×'])
  const filterBar = page.locator('.tag-filter')
  await expect(filterBar.locator('.tag-chip')).toHaveText([/^home/, /^planning/, /^work/])

  // Filtering by tag narrows the list; clicking again clears the filter.
  await filterBar.locator('.tag-chip', { hasText: 'home' }).click()
  await expect(page.locator('.notes-list li')).toHaveCount(1)
  await expect(page.locator('.notes-list li')).toContainText('Water plants')
  await filterBar.locator('.tag-chip', { hasText: 'home' }).click()
  await expect(page.locator('.notes-list li')).toHaveCount(2)

  // Tags persist across relaunch (they live in SQLite, not component state).
  const relaunched = await launch()
  await expect(
    relaunched.page.locator('.notes-list li', { hasText: 'Plan sprint' }).locator('.tag-chip')
  ).toHaveText(['planning×', 'work×'])

  // Untagging the only 'home' note prunes the orphaned tag from the filter bar.
  const plantsRow = relaunched.page.locator('.notes-list li', { hasText: 'Water plants' })
  await plantsRow.locator('.tag-remove').click()
  await expect(plantsRow.locator('.tag-chip')).toHaveCount(0)
  await expect(relaunched.page.locator('.tag-filter .tag-chip')).toHaveText([/^planning/, /^work/])

  // Deleting a note prunes its now-orphaned tags too.
  await relaunched.page
    .locator('.notes-list li', { hasText: 'Plan sprint' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await relaunched.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(relaunched.page.locator('.tag-filter')).toHaveCount(0)
})
