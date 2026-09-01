import { toast as manager } from './ui/toast'

// Facade over the vendored shadcn/Base UI toast manager. Same contract
// as the original house toast: successes only — errors stay inline
// next to their control, persistent.
export function useToast(): (message: string, description?: string) => void {
  return (message: string, description?: string) => {
    manager.add({ title: message, description, type: 'success', timeout: 2500 })
  }
}
