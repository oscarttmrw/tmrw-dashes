'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'

export default function InvitePage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong')
      } else {
        setStatus('success')
        setMessage(`Invite sent to ${email}`)
        setEmail('')
      }
    } catch {
      setStatus('error')
      setMessage('Network error — please try again')
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Invite User' },
        ]}
      />

      <div className="max-w-sm">
        <h1 className="mb-1 font-sans text-base font-semibold text-dash-text">Invite a user</h1>
        <p className="mb-6 text-xs text-dash-text-muted">
          Sends a Supabase invite email. The recipient will be prompted to set a password before
          accessing the dashboard.
        </p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@tmrw.health"
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>

          {message && (
            <p className={`text-xs ${status === 'error' ? 'text-status-red' : 'text-status-green'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white hover:bg-dash-red/90 disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}
