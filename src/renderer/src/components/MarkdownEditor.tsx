import { forwardRef, useImperativeHandle } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
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
}

/** The note content editor: Markdown in, Markdown out. StarterKit
 *  supplies the schema and input rules (type **bold**, # headings,
 *  lists…); the official Markdown extension parses string content and
 *  provides editor.getMarkdown(). */
const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ initial, onChange }, ref) {
    const editor = useEditor({
      extensions: [StarterKit, Markdown],
      content: initial,
      contentType: 'markdown',
      onUpdate: ({ editor: e }) => onChange(e.getMarkdown())
    })

    useImperativeHandle(ref, () => ({
      setMarkdown: (markdown: string) => {
        editor?.commands.setContent(markdown, { contentType: 'markdown' })
      }
    }))

    return (
      <EditorContent
        editor={editor}
        className="note-editor note-prose min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border border-border-input bg-surface-input px-2.5 py-2 text-[14px] leading-relaxed text-fg [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none"
      />
    )
  }
)

export default MarkdownEditor
