import Link from 'next/link'
import { Button } from '@/components/ui/button'

const faqs = [
  {
    question: 'How does MandateX work?',
    answer:
      'You complete a short questionnaire about your wealth management needs. MandateX generates a structured RFP, which you send to advisors of your choosing. They submit standardized proposals, and you compare them side by side.',
  },
  {
    question: 'How do advisors receive my RFP?',
    answer:
      'You invite advisors by email or share a unique link. Each advisor gets their own private submission page -- they never see other proposals.',
  },
  {
    question: 'Is my information confidential?',
    answer:
      'Yes. Advisors only see the RFP questions relevant to their proposal. Your full financial profile is never shared. Each advisor works independently with no visibility into other submissions.',
  },
  {
    question: 'How many advisors can I invite?',
    answer:
      'There is no limit. Invite as many advisors as you like to ensure a comprehensive comparison.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Creating an RFP and viewing the first three proposals is free. To unlock the full side-by-side comparison with all submitted proposals, a one-time fee of $499 applies.',
  },
  {
    question: 'Does MandateX recommend or rank advisors?',
    answer:
      'No. MandateX is a neutral platform. We present proposals with transparent, standardized data so you can make your own informed decision.',
  },
  {
    question: 'Can I use MandateX if I already have an advisor?',
    answer:
      'Absolutely. Many clients use MandateX to benchmark their current arrangement against competing proposals, ensuring they receive competitive terms and services.',
  },
  {
    question: 'What types of advisors can I invite?',
    answer:
      'Any wealth management professional -- private banks, RIAs, multi-family offices, wirehouses, or independent advisors. MandateX standardizes proposals across firm types so you can compare on equal footing.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">
            MandateX
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="text-sm text-neutral-900 font-medium">FAQ</Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start Your Search</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-neutral-500">
          Everything you need to know about using MandateX.
        </p>
      </section>

      {/* Questions */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-neutral-100 pb-8 last:border-0">
              <h3 className="text-base font-medium text-neutral-900 mb-2">{faq.question}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <p className="text-neutral-500 mb-6">Ready to find the right advisor?</p>
        <Link href="/signup">
          <Button size="lg">Start Your Search</Button>
        </Link>
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
