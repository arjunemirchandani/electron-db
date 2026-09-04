/** One-line plain-text preview of markdown content for list rows:
 *  syntax stripped, whitespace collapsed. Deliberately lightweight —
 *  fidelity belongs to the editor, this is a glance. */
export function markdownPreview(markdown: string): string {
  return markdown
    .replace(/^```[^\n]*$/gm, ' ') // fence lines (keep the code text)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^([-*+]|\d+\.)\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}
