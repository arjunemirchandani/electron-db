import type { CSSProperties } from 'react'

// Deterministic hue per tag name, so "work" is the same color everywhere
// and across sessions without storing anything.
export function tagHue(name: string): number {
  let hash = 0
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 360
}

export function tagStyle(name: string): CSSProperties {
  return { '--tag-h': tagHue(name) } as CSSProperties
}
