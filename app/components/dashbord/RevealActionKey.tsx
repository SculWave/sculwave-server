'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function RevealActivationKey({ networkId }: { networkId: string }) {
  const [key, setKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)

  useEffect(() => {
    if (!confirmingRegenerate) return

    const timeout = setTimeout(() => setConfirmingRegenerate(false), 4000)
    return () => clearTimeout(timeout)
  }, [confirmingRegenerate])

  async function reveal() {
    if (loading) return

    setLoading(true)

    try {
      const response = await fetch(`/api/dashboard/networks/${networkId}/activation-key`)

      if (!response.ok) {
        toast.error('Unable to reveal the activation key.')
        return
      }

      const data = await response.json()

      setKey(data.activationKey)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!key) return

    await navigator.clipboard.writeText(key)
    toast.success('Activation key copied.')
  }

  async function handleRegenerateClick() {
    if (!confirmingRegenerate) {
      setConfirmingRegenerate(true)
      return
    }

    setConfirmingRegenerate(false)
    setRegenerating(true)

    try {
      const response = await fetch(`/api/dashboard/networks/${networkId}/regenerate-key`, {
        method: 'POST',
      })

      if (!response.ok) {
        toast.error('Unable to regenerate the activation key.')
        return
      }

      const data = await response.json()

      setKey(data.activationKey)
      toast.success('Activation key regenerated. Update your config.yml on every server.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <>
      <div className="break-all border border-border bg-secondary/40 p-4 font-mono text-xs text-accent sm:text-sm">
        {key ?? '••••••••••••••••••••••••••••'}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reveal}
          disabled={loading}
          className="w-full border border-border bg-secondary px-4 py-2 text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Loading…' : 'Reveal'}
        </button>

        <button
          onClick={copy}
          disabled={!key}
          className="w-full border border-primary bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Copy
        </button>

        <button
          onClick={handleRegenerateClick}
          disabled={regenerating}
          className="w-full border border-destructive px-4 py-2 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {regenerating ? 'Regenerating…' : confirmingRegenerate ? 'Confirm regenerate?' : 'Regenerate'}
        </button>
      </div>
    </>
  )
}