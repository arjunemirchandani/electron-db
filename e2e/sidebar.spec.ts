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
