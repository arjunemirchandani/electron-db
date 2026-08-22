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
    const clipped = [...document.querySelectorAll<HTMLElement>('.notes button, .notes input')]
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
  await page.click('.backups-toggle')
  await page.click('.manage-tags-toggle')
  await expect(page.locator('.manage-tags-list li')).toHaveCount(4)

  for (const width of [320, 420, 600, 900]) {
    await setWidth(app, width, 700)
    // innerWidth includes a classic scrollbar (Windows/Linux); clientWidth doesn't.
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width)
    const report = await layoutReport(page)
    expect(report, `at ${width}px`).toEqual({ overflow: false, clipped: [] })
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
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBeGreaterThanOrEqual(
    320
  )
})
