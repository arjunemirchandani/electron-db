import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

async function setWidth(
  app: import('playwright').ElectronApplication,
  w: number,
  h: number
): Promise<void> {
  await app.evaluate(
    ({ BrowserWindow }, size) => {
      BrowserWindow.getAllWindows()[0].setContentSize(size.w, size.h)
    },
    { w, h }
  )
}

async function layoutReport(page: Page): Promise<{ overflow: boolean; clipped: string[] }> {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const clipped = [
      ...document.querySelectorAll<HTMLElement>('.notes button, .notes input, .sidebar button')
    ]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.left < 0 || r.right > viewport + 0.5
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('placeholder') || '').trim()}`
      )
    return { overflow: document.documentElement.scrollWidth > viewport, clipped }
  })
}

test('no horizontal overflow or clipped controls from 320px up', async ({ launch }) => {
  const { app, page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({
      title: 'A fairly long note title to stress the layout',
      content: 'with content',
      tags: ['work', 'planning', 'urgent']
    })
    await window.api.createNote({ title: 'Groceries', tags: ['home'] })
    await window.api.backupNow()
    location.reload()
  })
  await expect(page.locator('.tag-filter')).toBeVisible()
  await page.click('.sidebar-item[data-view="tags"]')
  await expect(page.locator('.manage-tags-list li')).toHaveCount(4)

  for (const width of [320, 420, 600, 900]) {
    await setWidth(app, width, 700)
    // innerWidth includes a classic scrollbar (Windows/Linux); clientWidth doesn't.
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width)
    for (const view of ['notes', 'backups', 'tags'] as const) {
      await page.click(`.sidebar-item[data-view="${view}"]`)
      const report = await layoutReport(page)
      expect(report, `at ${width}px in ${view}`).toEqual({ overflow: false, clipped: [] })
    }
  }
})

test('the window refuses to shrink below the 320px design floor', async ({ launch }) => {
  const { app, page } = await launch()
  await setWidth(app, 200, 300)
  // With useContentSize the floor is measured on the page itself.
  const size = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].getContentSize()
  )
  expect(size[0]).toBeGreaterThanOrEqual(320)
  expect(size[1]).toBeGreaterThanOrEqual(480)
  // innerWidth: classic scrollbars (Windows/Linux, and CI macOS) would shave clientWidth.
  expect(await page.evaluate(() => window.innerWidth)).toBeGreaterThanOrEqual(320)
})

test('note rows become stacked cards in a narrow panel, with relative dates', async ({
  launch
}) => {
  const { app, page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({ title: 'Fresh note', content: 'just written', tags: ['work'] })
    location.reload()
  })
  const row = page.locator('.note-row').first()
  await expect(row.locator('.notes-date')).toHaveText('just now')
  await expect(row.locator('.notes-date')).toHaveAttribute('title', /\d{4}|\d{1,2}:\d{2}/)

  await setWidth(app, 900, 700)
  await expect.poll(() => row.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row')
  await setWidth(app, 360, 700)
  await expect.poll(() => row.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column')

  await row.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.notes-empty')).toContainText('No notes yet')
})

test('long lists scroll inside the view; the window and sidebar stay put', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    for (let i = 1; i <= 25; i++) {
      await window.api.createNote({ title: `Note ${i}`, content: 'filler' })
    }
    location.reload()
  })
  await expect(page.locator('.note-row')).toHaveCount(25)
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const list = document.querySelector('.notes-list')!
    return {
      pageScrolls: doc.scrollHeight > doc.clientHeight + 1,
      listScrolls: list.scrollHeight > list.clientHeight + 1
    }
  })
  expect(report).toEqual({ pageScrolls: false, listScrolls: true })
})

test('macOS: a real drag element covers the strip beside the traffic lights', async ({
  launch
}) => {
  test.skip(process.platform !== 'darwin', 'hiddenInset title bar is macOS-only')
  const { page } = await launch()
  const probe = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, 18)
    if (!el) return null
    const style = getComputedStyle(el) as CSSStyleDeclaration & { webkitAppRegion?: string }
    return { className: el.className, appRegion: style.webkitAppRegion ?? '' }
  })
  expect(probe?.className).toContain('titlebar-drag')
  expect(probe?.appRegion).toBe('drag')
})
