'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function ToggleNetworkForm({
  networkId,
  active,
}: {
  networkId: string
  active: boolean
}) {
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return

    setLoading(true)

    try {
      const response = await fetch(`/api/dashboard/networks/${networkId}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        toast.error('Unable to update the network status.')
        return
      }

      location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Current Status</p>

        <div
          className={`mt-3 inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold ${
            active
              ? 'border-primary/20 bg-primary/15 text-primary'
              : 'border-destructive/20 bg-destructive/15 text-destructive'
          }`}
        >
          <span className="h-2 w-2 bg-current" />
          {active ? 'Active' : 'Disabled'}
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={loading}
        className={`border px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? 'border-destructive text-destructive hover:bg-destructive/10'
            : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {loading ? 'Updating…' : active ? 'Disable Network' : 'Enable Network'}
      </button>
    </div>
  )
}