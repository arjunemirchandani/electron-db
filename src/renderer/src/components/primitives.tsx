import type { ReactNode } from 'react'

interface WithChildren {
  className?: string
  children: ReactNode
}

/** Wrapping row of related controls. The `toolbar` class is a hook for
 *  callers' own overrides (e.g. .tag-filter tightens the gap). */
export function Toolbar({ className, children }: WithChildren): React.JSX.Element {
  return (
    <div className={`toolbar flex flex-wrap items-center gap-2 ${className ?? ''}`}>{children}</div>
  )
}

interface ListRowProps {
  className?: string
  /** Primary content; grows and wraps. */
  main: ReactNode
  /** Trailing controls; keep to the end of the row, wrap when cramped. */
  actions?: ReactNode
}

/** Media-object list item: content on the left, actions trailing.
 *  `list-row` stays as a stable hook — e2e specs count rows by it. */
export function ListRow({ className, main, actions }: ListRowProps): React.JSX.Element {
  return (
    <li
      className={`list-row flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2 rounded-md p-2 text-[13px] text-fg transition-colors duration-[120ms] hover:bg-white/[0.035] ${className ?? ''}`}
    >
      <div className="list-row-main flex min-w-0 flex-wrap items-center gap-2.5">{main}</div>
      {actions && (
        <div className="list-row-actions ml-auto flex flex-wrap items-center gap-1.5">
          {actions}
        </div>
      )}
    </li>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}

/** Square icon-only button; label doubles as tooltip and accessible name.
 *  Still CSS-styled: as a button inside .notes it sits under the
 *  `.notes button` blanket rule, which outranks layered utilities —
 *  migrates together with the button de-blanketing step. */
export function IconButton({
  label,
  onClick,
  className,
  children
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      className={`icon-button inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-fg-muted opacity-70 transition-[opacity,background-color,color] duration-[120ms] ${className ?? ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
