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

  // The + affordance on a note row adds tags in place, with autocomplete too.
  await input.press('Backspace')
  await expect(formChips).toHaveCount(0)
  await page.fill('input[placeholder="Title"]', 'Untagged note')
  await page.click('.notes-form button[type="submit"]')
  const untagged = page.locator('.notes-list li', { hasText: 'Untagged note' })
  await untagged.locator('.tag-add').click()
  const inline = untagged.locator('.tag-input-inline .notes-tags-input')
  await inline.type('urgent')
  await inline.press('Enter')
  await expect(untagged.locator('.tag-chip')).toHaveText(['urgent×'])
  await expect(page.locator('.tag-filter .tag-chip')).toHaveText([/^urgent/, /^work/])
  await expect(untagged.locator('.tag-input-inline')).toHaveCount(0)

  await untagged.locator('.tag-add').click()
  await untagged.locator('.tag-input-inline .notes-tags-input').type('wo')
  await page.locator('.tag-suggestions li', { hasText: 'work' }).click()
  await expect(untagged.locator('.tag-chip')).toHaveText(['urgent×', 'work×'])
})
