import { test, expect } from './fixtures'

test('search matches titles and content, composes with tag filters', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({
      title: 'Quarterly planning',
      content: 'set the roadmap',
      tags: ['work']
    })
    await window.api.createNote({
      title: 'Groceries',
      content: 'basil and 100% oat milk',
      tags: ['home']
    })
    await window.api.createNote({ title: 'Water plants', content: '', tags: ['home'] })
    location.reload()
  })
  const rows = page.locator('.note-row')
  const search = page.getByLabel('Search notes')
  await expect(rows).toHaveCount(3)

  // Title match, case-insensitive.
  await search.fill('quarterly')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Quarterly planning')
  await expect(page.locator('.search-count')).toHaveText('1 of 3')

  // Content match.
  await search.fill('basil')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Groceries')

  // FTS5 semantics: whole words and prefixes, punctuation is not a token.
  await search.fill('100')
  await expect(rows).toHaveCount(1)
  // Only the trailing token is a prefix (it's the word being typed).
  await search.fill('set road')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Quarterly planning')
  await search.fill('%')
  await expect(rows).toHaveCount(3)

  // No matches shows a search-specific empty state; Clear restores.
  await search.fill('zzz nothing')
  await expect(page.locator('.notes-empty')).toContainText('No notes match')
  await page.locator('.notes-search .tag-filter-clear').click()
  await expect(rows).toHaveCount(3)

  // Search composes with tag filtering: 'plan' matches two notes, home narrows to one.
  await search.fill('plan')
  await expect(rows).toHaveCount(2)
  await page.locator('.tag-filter .tag-chip', { hasText: 'home' }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Water plants')

  // Ranking: a title hit outranks a content hit for the same term.
  await page.locator('.tag-filter .tag-chip', { hasText: 'home' }).click()
  await search.fill('')
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'basil care', content: 'water twice a week' })
  })
  await search.fill('basil')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('basil care')
})
