import { getUserFromCookie } from '@/server/auth/session.js'
import { getNetworkDashboard } from '@/server/services/networkDashboard'
import { cookies } from 'next/headers.js'
import Link from 'next/link'
import { notFound } from 'next/navigation.js'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function NetworkPage({ params }: Props) {
  const { id } = await params

  const cookieStore = await cookies()

  const user = await getUserFromCookie(cookieStore.toString())

  if (!user) {
    notFound()
  }

  const data = await getNetworkDashboard(id)

  if (!data || data.network.ownerId !== user.id) {
    notFound()
  }

  const { network, stats } = data

  if (!network) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Hero */}

      <section className="flex flex-col gap-6 border border-border bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center border border-border px-3 py-1.5 text-xs font-semibold text-primary">
            SculWave Network
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{network.name}</h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Monitor connected servers, manage plugin configuration and control your Minecraft
            voice network.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold ${
            network.active
              ? 'border-primary/20 bg-primary/15 text-primary'
              : 'border-destructive/20 bg-destructive/15 text-destructive'
          }`}
        >
          <span className="h-2.5 w-2.5 bg-current" />
          {network.active ? 'Active' : 'Disabled'}
        </div>
      </section>

      {/* Stats */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Online Servers</p>
          <p className="mt-3 text-4xl font-bold text-foreground">{stats.onlineServers}</p>
        </div>

        <div className="border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Connected Players</p>
          <p className="mt-3 text-4xl font-bold text-foreground">{stats.connectedPlayers}</p>
        </div>

        <div className="border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Total Servers</p>
          <p className="mt-3 text-4xl font-bold text-foreground">{stats.totalServers}</p>
        </div>
      </div>

      {/* Quick Actions */}

      <section className="border border-border bg-card p-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
          <p className="mt-1 text-muted-foreground">
            Everything you need to configure and manage this network.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Link
            href={`/dashboard/networks/${network.id}/plugin`}
            className="group border border-border bg-secondary/40 p-7 transition-colors hover:border-primary hover:bg-secondary/60"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Plugin Setup</h3>
              <span className="text-primary transition-transform group-hover:translate-x-1">→</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Download the SculWave plugin, reveal your activation key, configure your server and
              monitor connected Minecraft servers.
            </p>
          </Link>

          <Link
            href={`/dashboard/networks/${network.id}/settings`}
            className="group border border-border bg-secondary/40 p-7 transition-colors hover:border-primary hover:bg-secondary/60"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Network Settings</h3>
              <span className="text-primary transition-transform group-hover:translate-x-1">→</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Rename your network, disable it temporarily or permanently delete it from your
              account.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}