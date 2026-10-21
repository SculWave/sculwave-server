type Props = {
  id: string
  name: string
  active: boolean
}

export default function NetworkCard({ id, name, active }: Props) {
  return (
    <div className="flex flex-col gap-4 border border-border bg-card px-6 py-5 transition-colors hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 ${active ? 'bg-primary' : 'bg-destructive'}`}
          aria-hidden="true"
        />

        <div>
          <h2 className="text-lg font-semibold text-foreground">{name}</h2>
          <p className="text-sm text-muted-foreground">
            {active ? 'Server online' : 'Server offline'}
          </p>
        </div>
      </div>

      <a
        href={`/dashboard/networks/${id}`}
        className="inline-flex items-center justify-center border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        Manage
      </a>
    </div>
  )
}