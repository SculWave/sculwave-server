import { Bell } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-6 lg:px-10">
        <div>
          <div className="inline-flex rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
            Dashboard
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Welcome Back</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your SculWave networks and connected Minecraft servers.
          </p>
        </div>

        <button className="glass flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10">
          <Bell size={20} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
