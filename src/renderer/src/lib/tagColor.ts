import type { CSSProperties } from 'react'

// Deterministic hue per tag name, so "work" is the same color everywhere
// and across sessions without storing anything.
export function tagHue(name: string): number {
  let hash = 0
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 360
}

export function tagStyle(name: string, hue?: number | null): CSSProperties {
  return { '--tag-h': hue ?? tagHue(name) } as CSSProperties
}

// Chip classes live beside the hue logic so every chip in the app is
// styled from one point. Color rides the --tag-h variable set by
// tagStyle. Static chips are labels (group/chip scopes the remove-x
// reveal); interactive chips tint, hover, and flip solid when active.
const CHIP_BASE =
  'inline-flex items-center gap-[5px] rounded-full border px-[9px] py-1 text-[12px] leading-none font-semibold'
const CHIP_TINT =
  'border-[hsl(var(--tag-h)_60%_55%/0.45)] bg-[hsl(var(--tag-h)_60%_55%/0.18)] text-[hsl(var(--tag-h)_70%_82%)]'
const CHIP_INTERACTIVE = 'cursor-pointer transition-[background-color,border-color] duration-[120ms]'

export function tagChipClass(kind: 'static' | 'inactive' | 'active'): string {
  if (kind === 'static') return `group/chip cursor-default ${CHIP_BASE} ${CHIP_TINT}`
  if (kind === 'active')
    return `${CHIP_BASE} ${CHIP_INTERACTIVE} border-[hsl(var(--tag-h)_60%_50%)] bg-[hsl(var(--tag-h)_60%_50%)] text-white`
  return `${CHIP_BASE} ${CHIP_TINT} ${CHIP_INTERACTIVE} hover:border-[hsl(var(--tag-h)_60%_55%/0.7)] hover:bg-[hsl(var(--tag-h)_60%_55%/0.3)]`
}
