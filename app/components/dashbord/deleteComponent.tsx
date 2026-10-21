'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function DeleteNetworkButton({ networkId }: { networkId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return

    const timeout = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timeout)
  }, [confirming])

  async function remove() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setConfirming(false)
    setLoading(true)

    try {
      const response = await fetch(`/api/dashboard/networks/${networkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Unable to delete the network.')
        return
      }

      location.href = '/dashboard/'
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-destructive">Delete Network</h3>

        <p className="mt-2 max-w-xl text-muted-foreground">
          This action permanently deletes this network, its activation key and every connected
          Minecraft server. This action cannot be undone.
        </p>
      </div>

      <button
        onClick={remove}
        disabled={loading}
        className="border border-destructive bg-destructive px-6 py-3 font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Deleting…' : confirming ? 'Confirm delete?' : 'Delete Network'}
      </button>
    </div>
  )
}