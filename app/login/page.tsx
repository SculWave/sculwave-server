'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, password }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || (response.status === 429 ? 'Too many attempts. Wait and try again.' : response.status === 503 ? 'Dashboard credentials are not configured by the administrator.' : 'Invalid username or password.'))
        return
      }
      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('Unable to connect to SculWave. Check that the server is running.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="hero-gradient flex min-h-screen items-center justify-center px-5 py-12"><section className="w-full max-w-md border border-border bg-card p-8 shadow-2xl"><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">SCULWAVE COMMUNITY</p><h1 className="mt-3 text-3xl font-bold text-foreground">Dashboard sign in</h1><p className="mt-2 text-sm text-muted-foreground">Sign in with the local administrator credentials configured in your .env file.</p></div><form onSubmit={submit} className="space-y-5"><div><label htmlFor="username" className="mb-2 block text-sm font-medium text-foreground">Username</label><input id="username" name="username" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-border bg-background px-3 py-3 text-foreground outline-none focus:border-primary" /></div><div><label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-border bg-background px-3 py-3 text-foreground outline-none focus:border-primary" /></div>{error && <p role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<button type="submit" disabled={busy} className="w-full bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button></form><p className="mt-6 text-xs leading-5 text-muted-foreground">Local administrator access only. Keep this service bound to localhost unless you have HTTPS and network access controls configured.</p></section></main>
}
