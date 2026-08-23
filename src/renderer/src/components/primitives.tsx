import type { ReactNode } from 'react'

interface WithChildren {
  className?: string
  children: ReactNode
}

/** Wrapping row of related controls. */
export function Toolbar({ className, children }: WithChildren): React.JSX.Element {
  return <div className={`toolbar ${className ?? ''}`}>{children}</div>
}

interface ListRowProps {
  className?: string
  /** Primary content; grows and wraps. */
  main: ReactNode
  /** Trailing controls; keep to the end of the row, wrap when cramped. */
  actions?: ReactNode
}

/** Media-object list item: content on the left, actions trailing. */
export function ListRow({ className, main, actions }: ListRowProps): React.JSX.Element {
  return (
    <li className={`list-row ${className ?? ''}`}>
      <div className="list-row-main">{main}</div>
      {actions && <div className="list-row-actions">{actions}</div>}
    </li>
  )
}

interface SectionProps extends WithChildren {
  title: string
  description?: string
}

/** Titled panel section, used for the expanding footer panels. */
export function Section({
  title,
  description,
  className,
  children
}: SectionProps): React.JSX.Element {
  return (
    <section className={`panel-section ${className ?? ''}`}>
      <header className="panel-section-header">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}

/** Square icon-only button; label doubles as tooltip and accessible name. */
export function IconButton({
  label,
  onClick,
  className,
  children
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      className={`icon-button ${className ?? ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
