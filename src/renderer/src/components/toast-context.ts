import { toast as manager } from './ui/toast'

// Facade over the vendored shadcn/Base UI toast manager. Same contract
// as the original house toast: successes only — errors stay inline
// next to their control, persistent.
export function useToast(): (message: string) => void {
  return (message: string) => {
    manager.add({ title: message, type: 'success', timeout: 2500 })
  }
}
