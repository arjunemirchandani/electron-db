import { useEffect, useState } from 'react'
import type { Note } from '../../../shared/types'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './ui/command'
import { toastError, useToast } from './toast-context'
import { renderMarked } from '../lib/marked'
import { ArchiveIcon, GearIcon, NotesIcon, TagIcon } from './icons'
import type { View } from './Sidebar'

interface CommandPaletteProps {
  onNavigate: (view: View) => void
  onRevealNote: (id: number) => void
}

const NAV: { view: View; label: string; icon: React.JSX.Element }[] = [
  { view: 'notes', label: 'Go to Notes', icon: <NotesIcon size={15} /> },
  { view: 'tags', label: 'Go to Tags', icon: <TagIcon size={15} /> },
  { view: 'backups', label: 'Go to Backups', icon: <ArchiveIcon size={15} /> },
  { view: 'settings', label: 'Go to Settings', icon: <GearIcon size={15} /> }
]

/** ⌘K / Ctrl+K palette: navigation, actions, and FTS5 note search.
 *  cmdk's own filtering is off — notes arrive pre-ranked from FTS
 *  (which matches content the title may not contain), and actions are
 *  filtered here by a simple label match. */
function CommandPalette({ onNavigate, onRevealNote }: CommandPaletteProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Note[]>([])
  const toast = useToast()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Empty-query clearing happens in the input handler; this effect only
  // fetches, keeping setState inside async callbacks.
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const timer = setTimeout(() => {
      window.api
        .searchNotes(q)
        .then(setResults)
        .catch(() => setResults([]))
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  const close = (): void => {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const go = (view: View): void => {
    close()
    onNavigate(view)
  }

  const backupNow = async (): Promise<void> => {
    close()
    try {
      await window.api.backupNow()
      toast('Backed up', 'Snapshot saved to Backups')
    } catch (err) {
      toastError('Backup failed', err instanceof Error ? err.message : String(err))
    }
  }

  const matches = (label: string): boolean =>
    !query.trim() || label.toLowerCase().includes(query.trim().toLowerCase())
  const nav = NAV.filter((item) => matches(item.label))
  const showBackup = matches('Back Up Database')

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      title="Command palette"
      description="Jump to a view, search notes, or run an action"
    >
      <Command shouldFilter={false}>
        <CommandInput
          autoFocus
          placeholder="Search notes or type a command…"
          value={query}
          onValueChange={(value) => {
            setQuery(value)
            if (!value.trim()) setResults([])
          }}
        />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Notes">
              {results.map((note) => (
                <CommandItem
                  key={note.id}
                  value={`note-${note.id}`}
                  onSelect={() => {
                    close()
                    onRevealNote(note.id)
                  }}
                >
                  <span className="min-w-0 truncate">
                    <strong>
                      {note.highlightedTitle ? renderMarked(note.highlightedTitle) : note.title}
                    </strong>
                    {note.contentSnippet && (
                      <span className="text-fg-muted"> — {renderMarked(note.contentSnippet)}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {nav.length > 0 && (
            <CommandGroup heading="Views">
              {nav.map((item) => (
                <CommandItem key={item.view} value={item.label} onSelect={() => go(item.view)}>
                  {item.icon}
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {showBackup && (
            <CommandGroup heading="Actions">
              <CommandItem value="Back Up Database" onSelect={() => void backupNow()}>
                <ArchiveIcon size={15} />
                Back Up Database
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export default CommandPalette
