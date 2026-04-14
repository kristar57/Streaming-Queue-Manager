import { ArrowLeft } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

export default function PrivacyPage() {
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

        <h1 className="text-2xl font-bold text-[#f5f5f5] mb-1">Privacy Policy</h1>
        <p className="text-sm text-[#606060] mb-8">Effective April 2026 · Version 2026-04</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">What is QueShare?</h2>
            <p>QueShare is a private, invite-only app for tracking movies and TV shows you want to watch — and sharing queues with people you watch with. Only people who have received a personal invitation can create an account. It is a non-commercial project run as a personal hobby.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">What information we collect</h2>
            <ul className="space-y-2 list-none">
              <li><span className="text-[#909090] font-medium">Account info</span> — your email address and the display name you choose when registering.</li>
              <li><span className="text-[#909090] font-medium">Watchlist data</span> — the titles you add to your queue, your watch status (up next, watching, watched, upcoming), notes, and ratings you provide.</li>
              <li><span className="text-[#909090] font-medium">Shared queue activity</span> — which shared queues you belong to, titles added to those queues, and each member's watch status within a queue. This is visible to all members of the shared queue.</li>
              <li><span className="text-[#909090] font-medium">Recommendations</span> — title recommendations you send to or receive from other members, including any message you include.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">How we use it</h2>
            <ul className="space-y-2 list-none">
              <li>To run the app and show you your watchlist, shared queues, and recommendations.</li>
              <li>To let members of a shared queue see each other's watch status for titles in that queue.</li>
              <li>To send invite emails when an admin sends a personal invitation (via the Resend email service). Your email address is only used to send the invite itself — we don't subscribe you to any mailing list.</li>
              <li>We do not sell your data, run ads, or share your information with third parties for any purpose beyond operating the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Third-party services</h2>
            <p>QueShare uses a small number of external services to operate:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-[#909090]">
              <li><span className="text-[#c0c0c0]">Supabase</span> — database and authentication (hosted in the United States)</li>
              <li><span className="text-[#c0c0c0]">TMDB (The Movie Database)</span> — movie and TV show metadata, posters, and streaming availability. Your watchlist queries are matched against their public API.</li>
              <li><span className="text-[#c0c0c0]">Resend</span> — transactional email for sending invite codes</li>
              <li><span className="text-[#c0c0c0]">Fly.io</span> — hosting for the frontend application</li>
            </ul>
            <p className="mt-2">None of these services receive personally identifiable information beyond what is necessary to operate the relevant feature.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Data storage</h2>
            <p>Your account data and watchlist are stored securely using Supabase, a managed database platform hosted in the United States. Passwords are never stored in plain text — authentication is handled entirely by Supabase's auth system.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Deleting your data</h2>
            <p>If you'd like your account and data removed, email us at <a href="mailto:hello@queshar.app" className="text-indigo-400 hover:text-indigo-300">hello@queshar.app</a>. We'll delete your account, watchlist entries, and queue memberships within a reasonable time. Note that titles you added to a shared queue may leave a record for other members in that queue.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Policy updates</h2>
            <p>If we make meaningful changes to this policy, we'll notify you the next time you log in and ask you to review and accept the updated terms before continuing.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e0e0e0] mb-3">Questions?</h2>
            <p>Reach out anytime at <a href="mailto:hello@queshar.app" className="text-indigo-400 hover:text-indigo-300">hello@queshar.app</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/8 flex flex-wrap gap-4 text-xs text-[#404040]">
          <Link to="/privacy" className="hover:text-[#909090] transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#909090] transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
