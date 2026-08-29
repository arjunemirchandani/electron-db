import { test, expect } from './fixtures'

test('backup button creates a backup and prunes to the 3 most recent', async ({
  launch,
  backups
}) => {
  const { page } = await launch()
  await page.click('.sidebar-item[data-view="backups"]')
  const button = page.locator('.notes-backup button', { hasText: 'Back Up Database' })

  await button.click()
  await expect(page.locator('.backup-status')).toContainText('Backed up to')
  expect(backups()).toHaveLength(1)

  // Three more backups: pruning must cap the total at 3.
  for (let i = 0; i < 3; i++) {
    await button.click()
    await expect(button).toBeEnabled()
  }
  await expect.poll(() => backups().length).toBe(3)
})
