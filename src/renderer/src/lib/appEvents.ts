// Featherweight cross-component signal: views emit after any change
// that can affect tags; the sidebar listens and refetches. No bus, no
// store — one DOM event.
const TAGS_CHANGED = 'electrondb:tags-changed'

export function emitTagsChanged(): void {
  window.dispatchEvent(new Event(TAGS_CHANGED))
}

export function onTagsChanged(listener: () => void): () => void {
  window.addEventListener(TAGS_CHANGED, listener)
  return () => window.removeEventListener(TAGS_CHANGED, listener)
}

const SETTINGS_CHANGED = 'electrondb:settings-changed'

export function emitSettingsChanged(): void {
  window.dispatchEvent(new Event(SETTINGS_CHANGED))
}

export function onSettingsChanged(listener: () => void): () => void {
  window.addEventListener(SETTINGS_CHANGED, listener)
  return () => window.removeEventListener(SETTINGS_CHANGED, listener)
}
