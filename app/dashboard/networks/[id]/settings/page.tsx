import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { prisma } from '@/server/database/prisma'
import { getUserFromCookie } from '@/server/auth/session'
import RenameNetworkForm from '@/app/components/dashbord/RenameNetworkForm'
import ToggleNetworkForm from '@/app/components/dashbord/ToggleNetworkForm'
import DeleteNetworkButton from '@/app/components/dashbord/deleteComponent'
import NetworkDiscoveryForm from '@/app/components/dashbord/NetworkDiscoveryForm'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function SettingsPage({ params }: Props) {
  const { id } = await params

  const cookieStore = await cookies()

  const user = await getUserFromCookie(cookieStore.toString())

  if (!user) notFound()

  const network = await prisma.network.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
  })

  if (!network) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}

      <section className="border border-border bg-card p-8 lg:p-10">
        <div className="inline-flex border border-border px-3 py-1.5 text-xs font-semibold text-primary">
          Network Settings
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
          Manage Your Network
        </h1>

        <p className="mt-3 max-w-2xl text-muted-foreground">
          Configure your network, manage activation, and control permanent changes from one
          place.
        </p>
      </section>

      {/* General */}

      <section className="border border-border bg-card p-8">
        <div className="mb-8">
          <div className="inline-flex border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            General
          </div>

          <h2 className="mt-4 text-2xl font-bold text-foreground">Network Information</h2>

          <p className="mt-2 text-muted-foreground">
            Rename your network to make it easier to identify.
          </p>
        </div>

        <RenameNetworkForm networkId={network.id} currentName={network.name} />
      </section>

      {/* Status */}

      {/* Discovery */}

      <section className="border border-border bg-card p-8">
        <div className="mb-8">
          <div className="inline-flex border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Discovery
          </div>

          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Public Network Discovery
          </h2>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Control how your network appears to players in the public server
            directory.
          </p>
        </div>

        <NetworkDiscoveryForm
          networkId={network.id}
          name={network.name}
          description={network.description}
          publicListed={network.publicListed}
          imageUrl={network.imageUrl}
          platformSupport={network.platformSupport}
          javaAddress={network.javaAddress}
          bedrockAddress={network.bedrockAddress}
          gameVersion={network.gameVersion}
          region={network.region}
          logoUrl={network.logoUrl}
        />
      </section>

      <section className="border border-border bg-card p-8">
        <div className="mb-8">
          <div className="inline-flex border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Status
          </div>

          <h2 className="mt-4 text-2xl font-bold text-foreground">Network Activation</h2>

          <p className="mt-2 text-muted-foreground">
            Temporarily disable this network without deleting it. Disabled networks cannot accept
            new server activations.
          </p>
        </div>

        <ToggleNetworkForm networkId={network.id} active={network.active} />
      </section>

      {/* Danger Zone */}

      <section className="border border-destructive/25 bg-destructive/5 p-8">
        <div className="mb-8">
          <div className="inline-flex border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            Danger Zone
          </div>

          <h2 className="mt-4 text-2xl font-bold text-destructive">Permanent Deletion</h2>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Deleting this network permanently removes the network, activation keys, connected
            servers and all associated configuration. This action cannot be undone.
          </p>
        </div>

        <div className="border border-destructive/20 bg-background/40 p-6">
          <DeleteNetworkButton networkId={network.id} />
        </div>
      </section>
    </div>
  )
}