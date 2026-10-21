import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getUserFromCookie } from '@/server/auth/session'
import LogoutButton from '@/app/components/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  const user = await getUserFromCookie(cookieStore.toString())

  if (!user) redirect('/login')

  return (
    <main className="hero-gradient dashboard-grid relative flex min-h-screen overflow-hidden">
      <LogoutButton />
      {/* Background Effects */}

      <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-accent/10 blur-3xl" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent,rgba(0,0,0,0.15))]" />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">{children}</div>
        </main>
      </div>
    </main>
  )
}
