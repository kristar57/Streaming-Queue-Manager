import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#c0c0c0]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
            <span className="text-indigo-400 font-bold text-sm">QS</span>
          </div>
          <span className="font-bold text-[#f5f5f5]">QueShare</span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-[#606060] hover:text-[#c0c0c0] transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 className="text-2xl font-bold text-[#f5f5f5] mb-1">Terms of Service</h1>
        <p className="text-sm text-[#606060] mb-8">Effective April 2026 · Version 2026-04</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Who can use QueShare</h2>
            <p>QueShare is a private app for keeping track of what to watch — movies, shows, and anything else in the queue. Access requires a personal invitation. If you received an invite code and created an account, you're welcome here. Sharing your invite code or attempting to access the app without authorization is not permitted.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Your data is yours</h2>
            <p>Everything you add — watchlist entries, notes, ratings, and queue contents — belongs to you. We don't claim ownership over any of it.</p>
            <p className="mt-2">When you join or create a shared queue with other members, the titles and statuses you contribute are visible to those members within that queue. Shared queues are collaborative by design.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">How to use QueShare</h2>
            <p>This is a small community app built for a specific group of people. Please:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-[#909090]">
              <li>Be respectful to other members in shared queues</li>
              <li>Don't use the app to harass or spam others</li>
              <li>Don't attempt to access other members' private data</li>
              <li>Don't use the app for commercial purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">No guarantees</h2>
            <p>QueShare is a personal, non-commercial project. It's provided as-is, with no warranty or guarantee of uptime, availability, or fitness for any particular purpose. We do our best to keep it running reliably, but we can't promise it will always be available.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Removing users or content</h2>
            <p>We reserve the right to remove any content that violates these terms or that we believe is harmful to the community, and to suspend or remove accounts in those cases. We'll always try to reach out first if there's a concern.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Governing law</h2>
            <p>These terms are governed by the laws of the State of Oregon, United States.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Changes to these terms</h2>
            <p>If we update these terms in a meaningful way, we'll let you know the next time you log in and ask you to review and accept the changes before continuing to use the app.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Questions?</h2>
            <p>Email us at <a href="mailto:hello@queshar.app" className="text-indigo-400 hover:text-indigo-300">hello@queshar.app</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/8 flex flex-wrap gap-4 text-xs text-[#404040]">
          <a href="/privacy" className="hover:text-[#909090] transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-[#909090] transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
