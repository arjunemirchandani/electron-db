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

test('toolbar formats via buttons, hides with the setting; rows preview stripped markdown', async ({
  launch
}) => {
  const { page } = await launch()
  await page.evaluate(async () => {
    await window.api.createNote({
      title: 'Preview doc',
      content: '# Head\n\n- item one\n\n**loud** `code`'
    })
    await window.api.createNote({ title: 'Toolbar doc', content: 'plain words' })
    location.reload()
  })

  // List rows show a plain-text preview: markdown syntax is stripped.
  const previewRow = page.locator('.note-row', { hasText: 'Preview doc' })
  await expect(previewRow.locator('.note-content')).toContainText('Head item one loud code')
  await expect(previewRow.locator('.note-content')).not.toContainText('#')
  await expect(previewRow.locator('.note-content')).not.toContainText('**')

  await page.locator('.note-row', { hasText: 'Toolbar doc' }).locator('.note-title-line').click()
  const editor = page.locator('.note-editor .ProseMirror')
  await expect(editor).toHaveText('plain words')
  const toolbar = page.locator('.editor-toolbar')
  await expect(toolbar.locator('button')).toHaveCount(8)

  // Buttons drive commands and reflect active state on the selection.
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await toolbar.locator('button[title="Bold"]').click()
  await expect(editor.locator('strong')).toHaveText('plain words')
  await expect(toolbar.locator('button[title="Bold"]')).toHaveAttribute('aria-pressed', 'true')
  await toolbar.locator('button[title="Heading 1"]').click()
  await expect(editor.locator('h1')).toHaveText('plain words')

  // The setting hides the toolbar (the editor itself is untouched).
  await page.click('.sidebar-item[data-view="settings"]')
  await page.getByLabel('Show toolbar').uncheck()
  await expect(page.locator('.toast', { hasText: 'Formatting toolbar off' })).toBeVisible()
  await page.click('.sidebar-item[data-view="notes"]')
  await page.locator('.note-row', { hasText: 'Toolbar doc' }).locator('.note-title-line').click()
  await expect(page.locator('.note-editor .ProseMirror')).toBeVisible()
  await expect(page.locator('.editor-toolbar')).toHaveCount(0)
})
