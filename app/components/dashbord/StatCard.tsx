import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string
  icon: ReactNode
}

export default function StatCard({ label, value, icon }: Props) {
  return (
    <div className="flex items-center gap-4 border border-border bg-card p-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-secondary/60 text-muted-foreground">
        <div className="h-5 w-5">{icon}</div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}