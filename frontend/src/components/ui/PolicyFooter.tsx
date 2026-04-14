import { Link } from 'react-router-dom'

export function PolicyFooter() {
  return (
    <footer className="mt-8 pb-6 flex items-center justify-center gap-4 text-[11px] text-[#555555]">
      <Link to="/privacy" className="hover:text-[#a0a0a0] transition-colors">Privacy Policy</Link>
      <span>·</span>
      <Link to="/terms" className="hover:text-[#a0a0a0] transition-colors">Terms of Service</Link>
    </footer>
  )
}
