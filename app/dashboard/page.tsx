import { cookies } from 'next/headers'

import { prisma } from '@/server/database/prisma'
import { getUserFromCookie } from '@/server/auth/session'

import StatCard from '../components/dashbord/StatCard'
import NetworkCard from '../components/dashbord/NetworkCard'
import CreateNetworkButton from '../components/dashbord/CreateNetworkButton'
import { getDashboardData } from '@/server/services/dashboardStats'

export const dynamic = 'force-dynamic'

function BlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path strokeLinejoin="round" d="M12 3v9M12 12l8-4.5M12 12l-8-4.5M12 12v9" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="6" rx="1" />
      <rect x="3" y="14" width="18" height="6" rx="1" />
      <circle cx="7" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PlayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path opacity="0.6" d="M16 8a3 3 0 100-6 3 3 0 000 6z" />
      <path opacity="0.6" d="M14 14.5c2.8.4 5 2.8 5 5.5" />
    </svg>
  )
}

export default async function DashboardPage() {
  const cookieStore = await cookies()

  const user = await getUserFromCookie(cookieStore.toString())

  if (!user) {
    return null
  }

  const { networks, stats } = await getDashboardData(user.id)

  return (
    <div className="relative min-h-screen space-y-8 pb-20">
      {/* Hero */}

      <section className="flex flex-col gap-6 border border-border bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-semibold text-primary">
            <span className="h-3.5 w-3.5">
              <BlockIcon />
            </span>
            SculWave Dashboard
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Manage your Minecraft voice networks, connected servers and plugin activations from
            one place.
          </p>
        </div>

        <CreateNetworkButton />
      </section>

      {/* Stats */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Networks" value={networks.length.toString()} icon={<BlockIcon />} />
        <StatCard label="Online Servers" value={stats.onlineServers.toString()} icon={<ServerIcon />} />
        <StatCard label="Connected Players" value={stats.connectedPlayers.toString()} icon={<PlayersIcon />} />
      </div>

      {/* Networks */}

      <section className="border border-border bg-card p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your Networks</h2>
            <p className="mt-1 text-muted-foreground">
              Create, configure and monitor every SculWave network.
            </p>
          </div>

          <div className="inline-flex items-center border border-border bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground">
            {networks.length} Network{networks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {networks.length === 0 ? (
          <div className="mt-8 border border-dashed border-border py-20 text-center">
            <div className="mx-auto max-w-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-border text-primary">
                <span className="h-6 w-6">
                  <BlockIcon />
                </span>
              </div>

              <h3 className="mt-6 text-xl font-semibold text-foreground">No networks yet</h3>

              <p className="mt-3 text-muted-foreground">
                Create your first SculWave network to activate Minecraft servers and enable
                seamless spatial voice chat.
              </p>

              <div className="mt-8 flex justify-center">
                <CreateNetworkButton />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {networks.map((network) => (
              <NetworkCard key={network.id} id={network.id} name={network.name} active={network.active} />
            ))}
          </div>
        )}
      </section>


    </div>
  )
}