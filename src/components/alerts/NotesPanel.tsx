import { useState } from 'react'
import type { AlertDetail, AlertNote, UserRole } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { addAlertNote } from '../../lib/api'
import { fmtTs, roleLabel } from '../../lib/utils'
import { Button } from '../shared/Button'

interface Props {
  alert:    AlertDetail
  onNoteAdded: (note: AlertNote) => void
}

export function NotesPanel({ alert, onNoteAdded }: Props) {
  const { role } = useApp()
  const [noteText, setNoteText] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Get the logged-in user's name from sessionStorage
  const storedUser = sessionStorage.getItem('raid_user')
  const currentUser = storedUser
    ? (JSON.parse(storedUser) as { username: string }).username
    : 'unknown'

  const handleSave = async () => {
    if (!noteText.trim()) return
    if (!role) return

    setSaving(true)
    setError('')

    try {
      const newNote = await addAlertNote(alert.sampleId, {
        author: currentUser,
        role:   role as UserRole,
        text:   noteText.trim(),
      })
      onNoteAdded(newNote)
      setNoteText('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-900">
          Analyst Notes
        </h3>
        <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
          {alert.notes.length} note{alert.notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Existing notes from database */}
      {alert.notes.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-2">No notes yet.</p>
      ) : (
        <div className="mb-4">
          {alert.notes.map((note) => (
            <div
              key={note.id}
              className="py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* Author avatar */}
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {note.author.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[12px] font-semibold text-gray-900">
                  {note.author}
                </span>
                <span className="text-[10px] text-gray-400">
                  {roleLabel(note.role)}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {fmtTs(note.createdAt)}
                </span>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed pl-8">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3">
        {/* New note input */}
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] outline-none resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white min-h-[80px] leading-relaxed"
          placeholder={`Add a note as ${currentUser}…`}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />

        {/* Error */}
        {error && (
          <p className="text-[11px] text-red-500 mt-1.5">{error}</p>
        )}

        <div className="flex justify-end mt-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !noteText.trim()}
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </span>
            ) : (
              'Save Note'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
