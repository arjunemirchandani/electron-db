import { test, expect } from './fixtures'

test('markdown round-trips: parsed to rich content, serialized on save', async ({ launch }) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({
      title: 'Spec doc',
      content: '# Plan\n\n- alpha\n- beta'
    })
    location.reload()
  })
  // Click the title line: parts of the row stop propagation for their
  // own controls, so a center-click can miss selection.
  await page.locator('.note-row .note-title-line').click()

  // Markdown parses into rich structure.
  const editor = page.locator('.note-editor .ProseMirror')
  await expect(editor.locator('h1')).toHaveText('Plan')
  await expect(editor.locator('li')).toHaveCount(2)

  // Typing with input rules: **bold** becomes strong…
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('\n\n**bold** move')
  await expect(editor.locator('strong', { hasText: 'bold' })).toBeVisible()

  // …and saving serializes the whole document back to markdown.
  await page.locator('.note-edit .button-primary').click()
  await expect
    .poll(async () => page.evaluate(async () => (await window.api.listNotes())[0].content))
    .toContain('**bold** move')
  const content = await page.evaluate(async () => (await window.api.listNotes())[0].content)
  expect(content).toContain('# Plan')
  expect(content).toContain('- alpha')
})
