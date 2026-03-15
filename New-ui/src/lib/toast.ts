export type ToastType = 'error' | 'warning' | 'success' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

// Setter injected by the Toaster component on mount
let _setter: ((fn: (prev: ToastItem[]) => ToastItem[]) => void) | null = null

export function _registerToastSetter(
  setter: (fn: (prev: ToastItem[]) => ToastItem[]) => void
) {
  _setter = setter
}

export function toast(message: string, type: ToastType = 'error', duration = 5000) {
  const id = Math.random().toString(36).slice(2)
  _setter?.((prev) => [...prev.slice(-4), { id, message, type }])
  setTimeout(() => {
    _setter?.((prev) => prev.filter((t) => t.id !== id))
  }, duration)
}
