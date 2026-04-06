'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Role = 'PROSPECT' | 'ADVISOR'

function SignupForm() {
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')
  const isEvaluateIntent = intent === 'evaluate'

  const [role, setRole] = useState<Role | null>(isEvaluateIntent ? 'PROSPECT' : null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) {
      setError('Please select your account type')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Auto sign-in after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but could not sign in automatically')
        setLoading(false)
      } else {
        const destination = role === 'ADVISOR' ? '/advisor/dashboard' : isEvaluateIntent ? '/evaluate' : '/questionnaire'
        router.push(destination)
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-neutral-900">
            MandateX
          </Link>
          <p className="mt-2 text-sm text-neutral-500">
            {isEvaluateIntent ? 'Create an account to evaluate your current advisor' : 'Create your account'}
          </p>
        </div>

        <Card className="p-8">
          {/* Role Selector */}
          {isEvaluateIntent ? (
            <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3">
              <p className="text-sm text-neutral-700">
                You'll be able to evaluate your current wealth management arrangement and compare it against market benchmarks.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                I am...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('PROSPECT')}
                  className={`flex flex-col items-center text-center px-4 py-5 rounded-md border transition-colors ${
                    role === 'PROSPECT'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <svg className="w-6 h-6 mb-2 text-neutral-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <span className="text-sm font-medium text-neutral-900">Looking for an advisor</span>
                  <span className="text-xs text-neutral-500 mt-1">Find and compare advisors</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADVISOR')}
                  className={`flex flex-col items-center text-center px-4 py-5 rounded-md border transition-colors ${
                    role === 'ADVISOR'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <svg className="w-6 h-6 mb-2 text-neutral-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                  <span className="text-sm font-medium text-neutral-900">I'm a wealth advisor</span>
                  <span className="text-xs text-neutral-500 mt-1">Register your firm</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="fullName"
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={8}
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !role}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-400">Or continue with</span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full mt-4"
              onClick={() => signIn('google', { callbackUrl: role === 'ADVISOR' ? '/advisor/dashboard' : isEvaluateIntent ? '/evaluate' : '/questionnaire' })}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-neutral-900 hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
