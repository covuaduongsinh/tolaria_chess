import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import type { ChessImportResult } from '../chess/chessGameImport'
import type { ChessImportSource } from '../chess/chessOnlineImport'

export interface ChessImportDialogLabels {
  title: string
  description: string
  pgnLabel: string
  placeholder: string
  importAction: string
  cancel: string
  sourcePaste: string
  sourceLichess: string
  sourceChesscom: string
  username: string
  fetchAction: string
  fetchError: string
  fetchEmpty: string
}

export interface ChessImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (pgn: string) => Promise<ChessImportResult>
  /** Optional online fetch; when provided the source selector is shown. */
  onFetch?: (source: ChessImportSource, username: string) => Promise<string>
  formatResult: (result: ChessImportResult) => string
  labels: ChessImportDialogLabels
}

type DialogSource = 'paste' | ChessImportSource

/** Import games by pasting PGN, or by fetching a user's games from Lichess/Chess.com.
 *  Parsing/note-creation/fetching are injected so the dialog stays presentational. */
export function ChessImportDialog({ open, onOpenChange, onImport, onFetch, formatResult, labels }: ChessImportDialogProps) {
  const [source, setSource] = useState<DialogSource>('paste')
  const [username, setUsername] = useState('')
  const [pgn, setPgn] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const runFetch = async () => {
    if (!onFetch || source === 'paste') return
    setBusy(true)
    setSummary(null)
    try {
      const fetched = await onFetch(source, username.trim())
      setPgn(fetched)
      if (fetched.trim() === '') setSummary(labels.fetchEmpty)
    } catch {
      setSummary(labels.fetchError)
    } finally {
      setBusy(false)
    }
  }

  const runImport = async () => {
    setBusy(true)
    setSummary(null)
    try {
      setSummary(formatResult(await onImport(pgn)))
    } finally {
      setBusy(false)
    }
  }

  const sourceButton = (value: DialogSource, label: string) => (
    <Button
      type="button"
      size="sm"
      variant={source === value ? 'default' : 'outline'}
      onClick={() => setSource(value)}
    >
      {label}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {onFetch ? (
          <div className="tolaria-chess-import__sources">
            {sourceButton('paste', labels.sourcePaste)}
            {sourceButton('lichess', labels.sourceLichess)}
            {sourceButton('chesscom', labels.sourceChesscom)}
          </div>
        ) : null}
        {onFetch && source !== 'paste' ? (
          <div className="tolaria-chess-import__fetch">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={labels.username}
              aria-label={labels.username}
            />
            <Button type="button" onClick={runFetch} disabled={busy || username.trim() === ''}>
              {labels.fetchAction}
            </Button>
          </div>
        ) : null}
        <Textarea
          value={pgn}
          onChange={(event) => setPgn(event.target.value)}
          placeholder={labels.placeholder}
          rows={10}
          spellCheck={false}
          aria-label={labels.pgnLabel}
        />
        {summary ? <p className="text-sm text-muted-foreground" role="status">{summary}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button type="button" onClick={runImport} disabled={busy || pgn.trim() === ''}>
            {labels.importAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
