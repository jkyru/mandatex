import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="text-sm text-neutral-500 hover:text-neutral-900">FAQ</Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start Your Search</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 leading-tight">
          Make wealth advisors<br />compete for your business
        </h1>
        <p className="mt-6 text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
          A structured, confidential process to evaluate and compare wealth management proposals. Submit your requirements once. Review responses side by side.
        </p>
        <div className="mt-10">
          <Link href="/signup">
            <Button size="lg">Start Your Search</Button>
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-neutral-100" />
      </div>

      {/* Value Props */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">01 — Define</h3>
            <p className="text-lg font-medium text-neutral-900 mb-2">Structured Requirements</p>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Complete a detailed questionnaire covering assets, complexity, goals, and preferences. Your requirements become a formal RFP.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">02 — Collect</h3>
            <p className="text-lg font-medium text-neutral-900 mb-2">Standardized Proposals</p>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Qualified advisors receive your RFP and respond with structured proposals — fees, services, team composition, and differentiation.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">03 — Compare</h3>
            <p className="text-lg font-medium text-neutral-900 mb-2">Side-by-Side Review</p>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Review all proposals in a neutral comparison dashboard. No rankings, no recommendations — just transparent data to inform your decision.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm text-neutral-400">MandateX</span>
          <span className="text-sm text-neutral-400">A neutral RFP platform for wealth management.</span>
        </div>
      </footer>
    </div>
  )
}
