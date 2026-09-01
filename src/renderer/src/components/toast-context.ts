import { createContext, useContext } from 'react'

// Lives apart from ToastProvider so component files export only
// components (react-refresh/only-export-components — mixed exports
// break Vite fast refresh for the whole file).
export const ToastContext = createContext<(message: string) => void>(() => {})

/** Returns a function that shows a transient success toast. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}
