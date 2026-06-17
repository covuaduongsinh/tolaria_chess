import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChessImportDialog, type ChessImportDialogLabels } from './ChessImportDialog'

const labels: ChessImportDialogLabels = {
  title: 'Import chess games',
  description: 'Paste PGN below.',
  pgnLabel: 'PGN moves',
  placeholder: 'Paste PGN…',
  importAction: 'Import',
  cancel: 'Cancel',
  sourcePaste: 'Paste',
  sourceLichess: 'Lichess',
  sourceChesscom: 'Chess.com',
  username: 'Username',
  fetchAction: 'Fetch',
  fetchError: 'Could not fetch games.',
  fetchEmpty: 'No games found.',
}

function formatResult(result: { imported: number; failed: number }): string {
  return `Imported ${result.imported}, skipped ${result.failed}`
}

afterEach(cleanup)

describe('ChessImportDialog', () => {
  it('disables import until PGN is entered', () => {
    render(<ChessImportDialog open onOpenChange={() => {}} onImport={vi.fn()} formatResult={formatResult} labels={labels} />)
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('runs the import and shows the result summary', async () => {
    const onImport = vi.fn().mockResolvedValue({ imported: 2, failed: 1 })
    render(<ChessImportDialog open onOpenChange={() => {}} onImport={onImport} formatResult={formatResult} labels={labels} />)

    fireEvent.change(screen.getByLabelText('PGN moves'), { target: { value: '1. e4 e5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(onImport).toHaveBeenCalledWith('1. e4 e5')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Imported 2, skipped 1'))
  })

  it('fetches games from an online source into the editor', async () => {
    const onFetch = vi.fn().mockResolvedValue('1. e4 e5')
    render(<ChessImportDialog open onOpenChange={() => {}} onImport={vi.fn()} onFetch={onFetch} formatResult={formatResult} labels={labels} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lichess' }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'magnus' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }))

    expect(onFetch).toHaveBeenCalledWith('lichess', 'magnus')
    await waitFor(() => expect(screen.getByLabelText('PGN moves')).toHaveValue('1. e4 e5'))
  })

  it('hides the source selector when no online fetch is available', () => {
    render(<ChessImportDialog open onOpenChange={() => {}} onImport={vi.fn()} formatResult={formatResult} labels={labels} />)
    expect(screen.queryByRole('button', { name: 'Lichess' })).toBeNull()
  })

  it('closes when cancel is pressed', () => {
    const onOpenChange = vi.fn()
    render(<ChessImportDialog open onOpenChange={onOpenChange} onImport={vi.fn()} formatResult={formatResult} labels={labels} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
