'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function logout() {
    setBusy(true)
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }) } finally {
      router.replace('/login')
      router.refresh()
      setBusy(false)
    }
  }
  return <button type="button" onClick={logout} disabled={busy} className="fixed right-5 top-5 z-50 border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary disabled:opacity-60">{busy ? 'Signing out…' : 'Sign out'}</button>
}
