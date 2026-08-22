import { test, expect } from './fixtures'
import type { Locator } from '@playwright/test'

test('manage tags panel colors, renames, merges, and deletes tags', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Sprint', tags: ['work', 'planing'] })
    await window.api.createNote({ title: 'Budget', tags: ['planing'] })
    await window.api.createNote({ title: 'Plants', tags: ['home'] })
    location.reload()
  })
  await page.click('.manage-tags-toggle')
  const rowFor = (name: string): Locator =>
    page
      .locator('.manage-tags-list li')
      .filter({ has: page.locator('.tag-chip', { hasText: name }) })

  // Color: picking a swatch stores the hue and recolors the filter chip.
  await rowFor('home').locator('.swatch[title="Hue 210"]').click()
  await expect(rowFor('home').locator('.swatch[title="Hue 210"]')).toHaveClass(/swatch-active/)
  const filterHue = await page
    .locator('.tag-filter .tag-chip', { hasText: 'home' })
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--tag-h').trim())
  expect(filterHue).toBe('210')

  // Rename propagates to every note row.
  await rowFor('planing').getByRole('button', { name: 'Rename' }).click()
  const rename = page.locator('.manage-tag-rename')
  await rename.fill('planning')
  await rename.press('Enter')
  await expect(page.locator('.notes-list .tag-chip', { hasText: 'planning' })).toHaveCount(2)
  await expect(page.locator('.notes-list .tag-chip', { hasText: 'planing' })).toHaveCount(0)

  // Renaming onto an existing name is refused with a helpful message.
  await rowFor('planning').getByRole('button', { name: 'Rename' }).click()
  await page.locator('.manage-tag-rename').fill('work')
  await page.locator('.manage-tag-rename').press('Enter')
  await expect(page.locator('.manage-tags .notes-error')).toContainText('merge into it instead')

  // Merge moves notes onto the target and removes the source.
  await rowFor('planning').getByRole('button', { name: 'Merge' }).click()
  await page.locator('.manage-tag-select').selectOption({ label: 'work' })
  await page.locator('.manage-tags .backup-confirm').click()
  await expect(rowFor('planning')).toHaveCount(0)
  const budget = page.locator('.notes-list li', { hasText: 'Budget' })
  await expect(budget.locator('.tag-chip')).toHaveText(['work×'])
  const sprint = page.locator('.notes-list li', { hasText: 'Sprint' })
  await expect(sprint.locator('.tag-chip')).toHaveText(['work×'])

  // Delete detaches the tag from all notes.
  await rowFor('work').getByRole('button', { name: 'Delete' }).click()
  await page.locator('.manage-tags .backup-confirm').click()
  await expect(rowFor('work')).toHaveCount(0)
  await expect(sprint.locator('.tag-chip')).toHaveCount(0)
  await expect(page.locator('.tag-filter .tag-chip')).toHaveText([/^home/])
})
