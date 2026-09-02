import { toast as manager } from './ui/toast'

// Facade over the vendored shadcn/Base UI toast manager.
// The channel contract: SUCCESS toasts for completed actions, ERROR
// toasts for failed fire-and-forget actions (backup, export, import,
// palette commands — surfaces with no form to sit beside). Form
// validation errors stay inline next to their fields, persistent.
export function useToast(): (message: string, description?: string) => void {
  return (message: string, description?: string) => {
    manager.add({ title: message, description, type: 'success', timeout: 2500 })
  }
}

/** Error toast for failed actions; lingers longer than successes. */
export function toastError(message: string, description?: string): void {
  manager.add({ title: message, description, type: 'error', timeout: 6000 })
}

/** Success toast carrying an Undo action. The click closes this toast
 *  explicitly (the primitive alone left it standing) before running
 *  the undo, so callers can follow up with their own confirmation. */
export function toastWithUndo(message: string, description: string, onUndo: () => void): void {
  const id = manager.add({
    title: message,
    description,
    type: 'success',
    timeout: 6000,
    actionProps: {
      children: 'Undo',
      onClick: () => {
        manager.close(id)
        onUndo()
      }
    }
  })
}
