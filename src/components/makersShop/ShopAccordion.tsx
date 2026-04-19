import { useId, useState, type ReactNode } from 'react'

type ShopAccordionProps = {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function ShopAccordion({ title, icon, defaultOpen = false, children, className = '' }: ShopAccordionProps) {
  const id = useId()
  const panelId = `${id}-panel`
  const buttonId = `${id}-button`
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`makers-shop-accordion ${className}`.trim()}>
      <button
        id={buttonId}
        type="button"
        className="makers-shop-accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="makers-shop-accordion__trigger-left">
          {icon ? <span className="makers-shop-accordion__trigger-icon">{icon}</span> : null}
          <span className="makers-shop-accordion__trigger-title">{title}</span>
        </span>
        <span className={`makers-shop-accordion__chevron${open ? ' makers-shop-accordion__chevron--open' : ''}`} aria-hidden />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        className={`makers-shop-accordion__panel${open ? ' makers-shop-accordion__panel--open' : ''}`}
      >
        <div className="makers-shop-accordion__panel-inner" inert={!open ? true : undefined}>
          {children}
        </div>
      </div>
    </div>
  )
}
