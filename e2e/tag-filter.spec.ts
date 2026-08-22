import { test, expect } from './fixtures'

test('multi-select filtering matches all or any selected tags', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Both', tags: ['work', 'urgent'] })
    await window.api.createNote({ title: 'Only work', tags: ['work'] })
    await window.api.createNote({ title: 'Only urgent', tags: ['urgent'] })
    await window.api.createNote({ title: 'Neither', tags: ['home'] })
    location.reload()
  })
  const bar = page.locator('.tag-filter')
  const rows = page.locator('.notes-list li')
  await expect(rows).toHaveCount(4)

  await bar.locator('.tag-chip', { hasText: 'work' }).click()
  await expect(rows).toHaveCount(2)
  // A single selection shows no match-mode switch.
  await expect(page.locator('.filter-mode')).toHaveCount(0)

  // Two selections default to "all": only the note carrying both.
  await bar.locator('.tag-chip', { hasText: 'urgent' }).click()
  await expect(page.locator('.filter-mode')).toBeVisible()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Both')
  await expect(bar.locator('.tag-filter-state')).toContainText('1 of 4')

  // "any" widens to the union.
  await page.locator('.filter-mode button', { hasText: 'any' }).click()
  await expect(rows).toHaveCount(3)
  await expect(bar.locator('.tag-filter-state')).toContainText('3 of 4')

  // Toggling a chip off and clearing both work.
  await bar.locator('.tag-chip', { hasText: 'urgent' }).click()
  await expect(rows).toHaveCount(2)
  await bar.locator('.tag-filter-clear').click()
  await expect(rows).toHaveCount(4)
})
