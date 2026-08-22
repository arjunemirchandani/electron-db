import { test, expect } from './fixtures'

test('tag input turns typed names into chips and autocompletes existing tags', async ({
  launch
}) => {
  const { page } = await launch()
  const input = page.locator('.notes-form .notes-tags-input')
  const formChips = page.locator('.notes-form .tag-chip')

  // Enter and comma both commit the draft as a chip; Backspace removes the last chip.
  await input.fill('work')
  await input.press('Enter')
  await expect(formChips).toHaveText(['work×'])
  await input.type('planning,')
  await expect(formChips).toHaveText(['work×', 'planning×'])
  await input.press('Backspace')
  await expect(formChips).toHaveText(['work×'])

  await page.fill('input[placeholder="Title"]', 'Plan sprint')
  await page.click('.notes-form button[type="submit"]')
  const row = page.locator('.notes-list li', { hasText: 'Plan sprint' })
  await expect(row.locator('.tag-chip')).toHaveText(['work×'])
  await expect(formChips).toHaveCount(0)

  // Typing a prefix of an existing tag offers it; Enter picks the suggestion.
  await input.type('wo')
  await expect(page.locator('.tag-suggestions li')).toHaveText(['work'])
  await input.press('Enter')
  await expect(formChips).toHaveText(['work×'])
  await expect(page.locator('.tag-suggestions')).toHaveCount(0)

  // Case-insensitive match reuses the existing tag rather than creating "Work".
  await input.press('Backspace')
  await input.type('Wo')
  await page.locator('.tag-suggestions li', { hasText: 'work' }).click()
  await expect(formChips).toHaveText(['work×'])
})
