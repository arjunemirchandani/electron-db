import { forwardRef, useImperativeHandle } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

export interface MarkdownEditorHandle {
  /** Replace the editor content (used by Escape-to-reset). */
  setMarkdown: (markdown: string) => void
}

interface MarkdownEditorProps {
  /** Initial markdown; the component is uncontrolled after mount
   *  (the parent remounts it via key when the note changes). */
  initial: string
  onChange: (markdown: string) => void
  showToolbar: boolean
}

const TOOLS: Array<{
  key: string
  label: string
  title: string
  run: (editor: Editor) => void
}> = [
  { key: 'bold', label: 'B', title: 'Bold', run: (e) => e.chain().focus().toggleBold().run() },
  {
    key: 'italic',
    label: 'I',
    title: 'Italic',
    run: (e) => e.chain().focus().toggleItalic().run()
  },
  {
    key: 'h1',
    label: 'H1',
    title: 'Heading 1',
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    key: 'h2',
    label: 'H2',
    title: 'Heading 2',
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    key: 'bullet',
    label: '•',
    title: 'Bullet list',
    run: (e) => e.chain().focus().toggleBulletList().run()
  },
  {
    key: 'ordered',
    label: '1.',
    title: 'Numbered list',
    run: (e) => e.chain().focus().toggleOrderedList().run()
  },
  {
    key: 'quote',
    label: '❝',
    title: 'Quote',
    run: (e) => e.chain().focus().toggleBlockquote().run()
  },
  {
    key: 'code',
    label: '</>',
    title: 'Code block',
    run: (e) => e.chain().focus().toggleCodeBlock().run()
  }
]

/** The note content editor: Markdown in, Markdown out. StarterKit
 *  supplies the schema and input rules (type **bold**, # headings,
 *  lists…); the official Markdown extension parses string content and
 *  provides editor.getMarkdown(). The toolbar is additive — markdown
 *  shortcuts work with it hidden. */
const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ initial, onChange, showToolbar }, ref) {
    const editor = useEditor({
      extensions: [StarterKit, Markdown],
      content: initial,
      contentType: 'markdown',
      onUpdate: ({ editor: e }) => onChange(e.getMarkdown())
    })

    const active = useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e
          ? {
              bold: e.isActive('bold'),
              italic: e.isActive('italic'),
              h1: e.isActive('heading', { level: 1 }),
              h2: e.isActive('heading', { level: 2 }),
              bullet: e.isActive('bulletList'),
              ordered: e.isActive('orderedList'),
              quote: e.isActive('blockquote'),
              code: e.isActive('codeBlock')
            }
          : null
    })

    useImperativeHandle(ref, () => ({
      setMarkdown: (markdown: string) => {
        editor?.commands.setContent(markdown, { contentType: 'markdown' })
      }
    }))

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showToolbar && editor && (
          <div className="editor-toolbar flex flex-wrap gap-1 pb-1.5">
            {TOOLS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                title={tool.title}
                aria-label={tool.title}
                aria-pressed={active?.[tool.key as keyof typeof active] ?? false}
                className={`btn min-w-[30px] px-2 py-0.5 text-[12px] ${
                  active?.[tool.key as keyof typeof active] ? 'bg-accent/[0.2] text-fg' : ''
                }`}
                onClick={() => tool.run(editor)}
              >
                {tool.label}
              </button>
            ))}
          </div>
        )}
        <EditorContent
          editor={editor}
          className="note-editor note-prose min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border border-border-input bg-surface-input px-2.5 py-2 text-[14px] leading-relaxed text-fg [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none"
        />
      </div>
    )
  }
)

export default MarkdownEditor
