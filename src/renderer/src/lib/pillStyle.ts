const META_PILL_BASE =
  'inline-flex max-w-full items-center gap-[5px] overflow-hidden rounded-sm border px-2 py-1 text-[11px] leading-none text-ellipsis whitespace-nowrap text-fg'

/** Key/value property pill; buttons add cursor+hover, the active filter
 *  pill flips to accent. */
export function metaPillClass(active: boolean): string {
  return active
    ? `${META_PILL_BASE} cursor-pointer border-[rgba(105,136,230,0.75)] bg-accent/[0.16]`
    : `${META_PILL_BASE} cursor-pointer border-border-subtle bg-white/[0.04] hover:border-[var(--ev-button-alt-hover-border)] hover:bg-white/[0.08]`
}
