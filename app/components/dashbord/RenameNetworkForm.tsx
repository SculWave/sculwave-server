'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const MAX_LENGTH = 32

export default function RenameNetworkForm({
  networkId,
  currentName,
}: {
  networkId: string
  currentName: string
}) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)

  const trimmed = name.trim()
  const unchanged = trimmed === currentName.trim()

  async function save() {
    if (!trimmed || loading) return

    setLoading(true)

    try {
      const response = await fetch(`/api/dashboard/networks/${networkId}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!response.ok) {
        toast.error('Unable to rename the network.')
        return
      }

      toast.success('Network renamed.')
      location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="network-name" className="text-sm font-medium text-foreground">
            Network Name
          </label>
          <span className="text-xs text-muted-foreground">
            {name.length}/{MAX_LENGTH}
          </span>
        </div>

        <input
          id="network-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_LENGTH}
          className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      <button
        onClick={save}
        disabled={loading || !trimmed || unchanged}
        className="border border-primary bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}