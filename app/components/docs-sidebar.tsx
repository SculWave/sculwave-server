'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Book,
  Settings,
  Zap,
  Users,
  Shield,
  Headphones,
  FileText,
  HelpCircle,
} from 'lucide-react'

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: <Book className="size-4" />,
  },
  {
    id: 'features',
    title: 'Features',
    icon: <Zap className="size-4" />,
  },
  {
    id: 'installation',
    title: 'Installation',
    icon: <Settings className="size-4" />,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    icon: <FileText className="size-4" />,
  },
  {
    id: 'commands',
    title: 'Commands',
    icon: <Headphones className="size-4" />,
  },
  {
    id: 'groups',
    title: 'Group Chat',
    icon: <Users className="size-4" />,
  },
  {
    id: 'moderation',
    title: 'Moderation',
    icon: <Shield className="size-4" />,
  },
  {
    id: 'support',
    title: 'Support',
    icon: <HelpCircle className="size-4" />,
  },
]

export function DocsSidebar({
  activeSection,
}: {
  activeSection: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  const activeItem =
    sections.find((section) => section.id === activeSection) ??
    sections[0]

  const handleClick = (id: string) => {
    const element = document.getElementById(id)

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    setIsOpen(false)
  }

  return (
    <div className="w-full shrink-0 md:w-64">
      {/* =========================
          MOBILE NAVIGATION
      ========================== */}
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-primary">
              {activeItem.icon}
            </span>

            <span className="truncate">
              {activeItem.title}
            </span>
          </div>

          <ChevronDown
            className={`ml-3 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <>
            {/* Dropdown */}
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <nav className="max-h-[60vh] overflow-y-auto p-2">
                {sections.map((section) => {
                  const active =
                    activeSection === section.id

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleClick(section.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <span className="shrink-0">
                        {section.icon}
                      </span>

                      <span>{section.title}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* =========================
          DESKTOP SIDEBAR
      ========================== */}
      <aside className="hidden md:block">
        <nav className="sticky top-24 space-y-1">
          {sections.map((section) => {
            const active =
              activeSection === section.id

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleClick(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="shrink-0">
                  {section.icon}
                </span>

                <span className="truncate">
                  {section.title}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}