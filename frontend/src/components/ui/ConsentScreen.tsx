import { useState } from 'react'
import { Loader2, CheckSquare, Square } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CURRENT_POLICY_VERSION } from '../../types'

interface ConsentScreenProps {
  userId: string
  isUpdate?: boolean
  onAccepted: () => void
}

export default function ConsentScreen({ userId, isUpdate = false, onAccepted }: ConsentScreenProps) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    if (!checked || saving) return
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          consent_accepted_at: new Date().toISOString(),
          consent_policy_version: CURRENT_POLICY_VERSION,
        })
        .eq('id', userId)
      if (error) throw error
      onAccepted()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#141414] border border-white/8 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-[#f5f5f5] mb-2">
          {isUpdate ? 'Our policies have been updated' : 'Before you get started'}
        </h2>
        <p className="text-sm text-[#a0a0a0] mb-5">
          {isUpdate
            ? 'We\'ve made changes to our Terms of Service and Privacy Policy. Please review the updates and confirm your agreement to continue.'
            : 'Welcome to QueShare! Please take a moment to review how we handle your data.'}
        </p>

        <div className="mb-5">
          <button
            type="button"
            onClick={() => setChecked(!checked)}
            className="w-full flex items-start gap-3 text-left group"
          >
            <span className="mt-0.5 shrink-0 text-indigo-400">
              {checked
                ? <CheckSquare size={18} />
                : <Square size={18} className="text-[#555555] group-hover:text-[#a0a0a0]" />
              }
            </span>
            <span className="text-sm text-[#a0a0a0] leading-snug">
              I've read and agree to the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </span>
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={!checked || saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {isUpdate ? 'I Agree — Continue' : 'I Agree — Continue to QueShare'}
        </button>

        <p className="text-[11px] text-[#555555] text-center mt-3">
          You must agree to continue.
        </p>
      </div>
    </div>
  )
}
