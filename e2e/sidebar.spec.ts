import { test, expect } from './fixtures'

test('sidebar switches views and marks the active item', async ({ launch }) => {
  const { page } = await launch()

  // Notes is the default view.
  await expect(page.locator('.notes h2')).toHaveText('Notes')
  await expect(page.locator('.sidebar-item[data-view="notes"]')).toHaveClass(/sidebar-item-active/)

  await page.click('.sidebar-item[data-view="backups"]')
  await expect(page.locator('.notes h2')).toHaveText('Backups')
  await expect(page.locator('.sidebar-item[data-view="backups"]')).toHaveClass(
    /sidebar-item-active/
  )
  await expect(page.locator('.sidebar-item[data-view="notes"]')).not.toHaveClass(
    /sidebar-item-active/
  )

  await page.click('.sidebar-item[data-view="tags"]')
  await expect(page.locator('.notes h2')).toHaveText('Tags')

  await page.click('.sidebar-item[data-view="notes"]')
  await expect(page.locator('.notes h2')).toHaveText('Notes')

  // Real tooltips replaced native titles: hover shows the label.
  await page.hover('.sidebar-toggle')
  await expect(page.locator('[data-slot="tooltip-content"]')).toHaveText('Collapse sidebar')
})

test('sidebar lists tags and clicking one filters the notes view', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Sprint', tags: ['work'] })
    await window.api.createNote({ title: 'Plants', tags: ['home'] })
    location.reload()
  })
  const sidebarTag = page.locator('.sidebar-tag', { hasText: 'home' })
  await expect(sidebarTag).toContainText('1')
  await page.click('.sidebar-item[data-view="backups"]')
  await sidebarTag.click()
  await expect(page.locator('.notes h2')).toHaveText('Notes')
  await expect(page.locator('.tag-filter .tag-chip-active')).toHaveText(/^home/)
  await expect(page.locator('.note-row')).toHaveCount(1)
  await expect(page.locator('.note-row')).toContainText('Plants')

  // Live updates: creating a tagged note refreshes the sidebar without
  // a view change.
  await page.locator('.tag-filter-clear', { hasText: 'Clear' }).click()
  await page.fill('input[placeholder="Title"]', 'Fresh idea')
  await page.locator('.notes-form-tags input').fill('fresh')
  await page.click('.notes-form button[type="submit"]')
  await expect(page.locator('.sidebar-tag', { hasText: 'fresh' })).toContainText('1')
})

test('sidebar collapse is remembered across relaunches', async ({ launch }) => {
  const { app, page } = await launch()
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-collapsed/)

  await page.click('.sidebar-toggle')
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar-collapsed/)

  // A clean close flushes localStorage; relaunching while the first
  // instance still holds the store would read a stale value.
  await app.close()
  const relaunched = await launch()
  await expect(relaunched.page.locator('.sidebar')).toHaveClass(/sidebar-collapsed/)

  // Expanding again is remembered too.
  await relaunched.page.click('.sidebar-toggle')
  await expect(relaunched.page.locator('.sidebar')).not.toHaveClass(/sidebar-collapsed/)
})
