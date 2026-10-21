'use client'

import { useState } from 'react'
import {
  Book,
  ChevronDown,
  FileText,
  Headphones,
  HelpCircle,
  Settings,
  Shield,
  Users,
  Zap,
} from 'lucide-react'
import type { DocsNavSection } from './docs-config'

const icons = {
  book: Book,
  zap: Zap,
  settings: Settings,
  'file-text': FileText,
  headphones: Headphones,
  users: Users,
  shield: Shield,
  'help-circle': HelpCircle,
}

interface DocsSidebarProps {
  sections: readonly DocsNavSection[]
  activeSection: string
  onNavigate: (id: string) => void
}

export function DocsSidebar({
  sections,
  activeSection,
  onNavigate,
}: DocsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeItem = sections.find(section => section.id === activeSection) ?? sections[0]
  const ActiveIcon = icons[activeItem.icon as keyof typeof icons] ?? Book
  const navigate = (id: string) => {
    onNavigate(id)
    setIsOpen(false)
  }
  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
      active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
    }`

  return (
    <div className="w-full shrink-0 md:w-64">
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(value => !value)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <ActiveIcon className="size-4 shrink-0 text-primary" />
            <span className="truncate">{activeItem.title}</span>
          </span>
          <ChevronDown
            className={`ml-3 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <nav className="max-h-[60vh] overflow-y-auto p-2">
              {sections.map(section => {
                const Icon = icons[section.icon as keyof typeof icons] ?? Book
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => navigate(section.id)}
                    className={itemClass(activeSection === section.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{section.title}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      <aside className="hidden md:block">
        <nav className="sticky top-24 space-y-1">
          {sections.map(section => {
            const Icon = icons[section.icon as keyof typeof icons] ?? Book
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => navigate(section.id)}
                aria-current={activeSection === section.id ? 'location' : undefined}
                className={itemClass(activeSection === section.id)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{section.title}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}
