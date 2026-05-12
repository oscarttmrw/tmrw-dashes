'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin/upload')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dash-bg">
      <div className="w-full max-w-sm rounded-lg border border-dash-border bg-dash-surface p-8">
        <h1 className="mb-6 font-sans text-lg font-semibold text-dash-text">Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          {error && <p className="text-xs text-status-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white hover:bg-dash-red/90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
