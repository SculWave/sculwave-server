'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const MAX_LENGTH = 32

export default function CreateNetworkButton() {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  function closeModal() {
    setOpen(false)
    setName('')
    setError(null)
  }

  async function createNetwork() {
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/networks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmed,
        }),
      })

      if (!response.ok) {
        throw new Error('Could not create the network. Please try again.')
      }

      setOpen(false)
      setName('')

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the network. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center border border-primary bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Create Network
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-network-title"
            className="w-full max-w-md border border-border bg-card p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="create-network-title" className="text-xl font-semibold text-foreground">
                  Create Network
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Create a new SculWave network to connect your Minecraft servers.
                </p>
              </div>

              <button
                onClick={closeModal}
                aria-label="Close"
                className="border border-border bg-secondary p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="network-name" className="block text-sm font-medium text-foreground">
                  Network Name
                </label>
                <span className="text-xs text-muted-foreground">
                  {name.length}/{MAX_LENGTH}
                </span>
              </div>

              <input
                id="network-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim() && !loading) createNetwork()
                }}
                placeholder="My Survival Network"
                maxLength={MAX_LENGTH}
                className="w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
              />

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                className="border border-border bg-secondary px-5 py-3 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Cancel
              </button>

              <button
                disabled={loading || !name.trim()}
                onClick={createNetwork}
                className="border border-primary bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Network'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}