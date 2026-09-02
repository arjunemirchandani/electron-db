import { test, expect } from './fixtures'

test('⌘K palette navigates views, jumps to FTS matches, runs actions', async ({
  launch,
  backups
}) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({
      title: 'Sprint plan',
      content: 'the roadmap for next quarter',
      tags: ['work']
    })
    await window.api.createNote({ title: 'Groceries', content: 'oat milk' })
    location.reload()
  })
  await expect(page.locator('.note-row')).toHaveCount(2)

  // Opens from the keyboard; a view item navigates.
  await page.keyboard.press('Control+k')
  await expect(page.locator('[data-slot="command-input"]')).toBeVisible()
  await page.getByRole('option', { name: 'Go to Tags' }).click()
  await expect(page.locator('.notes h2')).toHaveText('Tags')

  // FTS search: 'roadmap' lives only in the CONTENT — the palette still
  // finds the note (cmdk's own filtering is off) and jumping reveals it.
  await page.keyboard.press('Control+k')
  await page.locator('[data-slot="command-input"]').fill('roadmap')
  const noteOption = page.getByRole('option', { name: /Sprint plan/ })
  await expect(noteOption).toBeVisible()
  await noteOption.click()
  await expect(page.locator('.notes h2')).toHaveText('Notes')
  const row = page.locator('[data-note-id]').filter({ hasText: 'Sprint plan' })
  await expect(row).toHaveClass(/note-row-flash/)
  await expect(row).toBeInViewport()

  // Actions run with toast feedback.
  await page.keyboard.press('Control+k')
  await page.locator('[data-slot="command-input"]').fill('back')
  await page.getByRole('option', { name: 'Back Up Database' }).click()
  await expect(page.locator('.toast')).toContainText('Backed up')
  expect(backups()).toHaveLength(1)
})
