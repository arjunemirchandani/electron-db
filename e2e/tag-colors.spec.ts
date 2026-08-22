import { test, expect } from './fixtures'

test('a stored hue overrides the derived tag color everywhere', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Plan sprint', tags: ['work'] })
    location.reload()
  })
  const hueOf = (selector: string): Promise<string> =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--tag-h'))

  const derived = await hueOf('.tag-filter .tag-chip')
  expect(derived).not.toBe('200')

  const tagId = await page.evaluate(async () => (await window.api.listTags())[0].id)
  await page.evaluate(async (id) => {
    await window.api.setTagHue(id, 200)
    location.reload()
  }, tagId)
  await expect(page.locator('.tag-filter .tag-chip')).toHaveCount(1)
  expect((await hueOf('.tag-filter .tag-chip')).trim()).toBe('200')
  expect((await hueOf('.notes-list .tag-chip')).trim()).toBe('200')

  // Null restores the name-derived color.
  await page.evaluate(async (id) => {
    await window.api.setTagHue(id, null)
    location.reload()
  }, tagId)
  await expect(page.locator('.tag-filter .tag-chip')).toHaveCount(1)
  expect((await hueOf('.tag-filter .tag-chip')).trim()).toBe(derived.trim())
})
