'use client'

import { useCallback, useEffect, useState } from 'react'
import { DocsSidebar } from './docs-sidebar'
import { DocsContent } from './docs-content'
import type { DocsSection } from './docs-config'

interface DocsLayoutProps {
  sections: readonly DocsSection[]
}

export function DocsLayout({ sections }: DocsLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(
    sections[0]?.id ?? 'overview'
  )

  const handleNavigate = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    setActiveSection(id)
  }, [])

  useEffect(() => {
    const elements = sections
      .map(section => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)

    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible) setActiveSection(visible.target.id)
      },
      {
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      }
    )

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [sections])

  return (
    <>
      <DocsSidebar
        sections={sections}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      <main className="min-w-0 flex-1 md:border-l md:border-border md:pl-8">
        <DocsContent sections={sections} />
      </main>
    </>
  )
}
