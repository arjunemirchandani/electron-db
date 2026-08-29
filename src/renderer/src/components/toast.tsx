import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Success feedback only: a toast that fades away is fine for "Saved",
// never for errors — those stay inline next to the control, persistent.

/** Must match the .toast animation duration in main.css. */
const TOAST_LIFETIME_MS = 2500

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

/** Returns a function that shows a transient success toast. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_LIFETIME_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
