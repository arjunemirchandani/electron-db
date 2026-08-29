import { test, expect } from './fixtures'

test('backup retention setting controls pruning and survives relaunch', async ({
  launch,
  backups
}) => {
  const { app, page } = await launch()
  await page.click('.sidebar-item[data-view="settings"]')
  const input = page.locator('.settings-retention input')
  await expect(input).toHaveValue('3')

  // The steppers clamp at the bounds.
  await page.locator('.settings-retention button[aria-label="Fewer backups"]').click()
  await expect(input).toHaveValue('2')
  await page.locator('.settings-retention button[aria-label="Fewer backups"]').click()
  await expect(input).toHaveValue('1')
  await expect(
    page.locator('.settings-retention button[aria-label="Fewer backups"]')
  ).toBeDisabled()
  await expect(page.locator('.settings-status')).toHaveText('Saved')

  // Pruning honors the live value: two backups, only the newest kept.
  await page.click('.sidebar-item[data-view="backups"]')
  const backupButton = page.locator('.notes-backup button', { hasText: 'Back Up Database' })
  await backupButton.click()
  await expect(page.locator('.backup-status')).toContainText('Backed up to')
  await backupButton.click()
  await expect(backupButton).toBeEnabled()
  await expect.poll(() => backups().length).toBe(1)
  await expect(page.locator('.backups-list .list-row')).toHaveCount(1)

  // settings.json persists across a clean relaunch.
  await app.close()
  const relaunched = await launch()
  await relaunched.page.click('.sidebar-item[data-view="settings"]')
  await expect(relaunched.page.locator('.settings-retention input')).toHaveValue('1')
})
