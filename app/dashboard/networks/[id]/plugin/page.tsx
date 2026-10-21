import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { prisma } from '@/server/database/prisma'
import { getUserFromCookie } from '@/server/auth/session'
import RevealActivationKey from '@/app/components/dashbord/RevealActionKey'
import Link from 'next/link'
import { PUBLIC_URL, SELF_HOSTED } from '@/server/config/mode'
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from 'react'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function PluginPage({ params }: Props) {
  const { id } = await params

  const cookieStore = await cookies()

  const user = await getUserFromCookie(cookieStore.toString())

  if (!user) {
    notFound()
  }

  const network = await prisma.network.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
  })

  if (!network) {
    notFound()
  }

  const onlineBackends = await prisma.backend.findMany({
    where: {
      networkId: network.id,
      online: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="space-y-8">
      {/* Hero */}

      <section className="border border-border bg-card p-8 lg:p-10">
        <div className="inline-flex border border-border px-3 py-1.5 text-xs font-semibold text-primary">
          Plugin Setup
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
          Connect Your Minecraft Server
        </h1>

        <p className="mt-3 max-w-2xl text-muted-foreground">
          Install the SculWave plugin, activate your network and start using seamless proximity
          voice chat across your Minecraft servers.
        </p>
      </section>

      {/* Setup Steps */}

      <div className="space-y-4">
        {/* Step 1 */}

        <section className="border border-border bg-card p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary text-lg font-bold text-primary">
              1
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">Download Plugin</h2>

              <p className="mt-2 text-muted-foreground">
                Download the latest SculWave Paper plugin and place it inside your server's plugins
                folder.
              </p>

              <Link
                href="https://sculwave.com/downloads"
                className="mt-6 inline-flex border border-primary bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Download Plugin
              </Link>
            </div>
          </div>
        </section>

        {/* Step 2 */}

        <section className="border border-border bg-card p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary text-lg font-bold text-primary">
              2
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">Activation Key</h2>

              <p className="mt-2 text-muted-foreground">
                Reveal your unique activation key. Each network has its own key.
              </p>

              <div className="mt-6">
                <RevealActivationKey networkId={network.id} />
              </div>
            </div>
          </div>
        </section>

        {/* Step 3 */}

        <section className="border border-border bg-card p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary text-lg font-bold text-primary">
              3
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">Configure Plugin</h2>

              <p className="mt-2 text-muted-foreground">
                Paste the activation key into your generated
                <code className="mx-1 border border-border bg-secondary px-2 py-1">config.yml</code>
                and restart your server.
              </p>

              <pre className="mt-6 overflow-x-auto border border-border bg-secondary/40 p-6 font-mono text-sm text-accent">
                {SELF_HOSTED
                  ? `activation-key: ew_live_xxxxxxxxxxxxxxxxxxxxxxxxx\nserver-url: ${PUBLIC_URL}`
                  : `activation-key: ew_live_xxxxxxxxxxxxxxxxxxxxxxxxx`}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Connection Status */}

      <section className="border border-border bg-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Connected Servers</h2>

            <p className="mt-1 text-muted-foreground">
              Servers that are currently connected to this network.
            </p>
          </div>

          <div className="border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            {onlineBackends.length} Online
          </div>
        </div>

        {onlineBackends.length === 0 ? (
          <div className="mt-8 border border-dashed border-border py-16 text-center">
            <h3 className="text-lg font-semibold text-foreground">Waiting for your first server…</h3>

            <p className="mt-3 text-muted-foreground">
              Install the plugin, add your activation key and restart your Paper server.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {onlineBackends.map((server: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; platform: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; mcVersion: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined }) => (
              <div
                key={server.id}
                className="border border-border bg-secondary/40 p-5 transition-colors hover:border-primary"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{server.name}</h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {server.platform} • {server.mcVersion}
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 border border-primary/20 bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary">
                    <span className="h-2 w-2 bg-current" />
                    Online
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}