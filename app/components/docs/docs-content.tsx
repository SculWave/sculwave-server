'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import type { Components } from 'react-markdown'
import type { DocsSection } from './docs-config'

const components: Components = {
  h1: ({ children }) => <h1 className="mb-5 text-4xl font-bold tracking-tight text-foreground">{children}</h1>,
  h2: ({ children, ...props }) => <h2 {...props} className="mt-10 scroll-mt-24 border-t border-border/70 pt-7 text-2xl font-bold tracking-tight text-foreground first:mt-0 first:border-t-0 first:pt-0">{children}</h2>,
  h3: ({ children, ...props }) => <h3 {...props} className="mt-7 scroll-mt-24 text-lg font-semibold leading-7 text-foreground">{children}</h3>,
  p: ({ children }) => <p className="my-4 max-w-3xl text-base leading-7 text-muted-foreground">{children}</p>,
  ul: ({ children }) => <ul className="my-5 flex list-disc flex-col gap-2 pl-6 text-base leading-7 text-muted-foreground marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 flex list-decimal flex-col gap-2 pl-6 text-base leading-7 text-muted-foreground marker:text-primary">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => <a href={href} className="font-medium text-primary underline-offset-4 hover:underline" target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-5 rounded-r-lg border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => <div className="my-5 overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-muted/50 text-foreground">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-4 py-3 text-muted-foreground">{children}</td>,
  pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-card/60 p-4 font-mono text-sm leading-6 text-foreground">{children}</pre>,
  code: ({ children, className }) => <code className={`${className ?? ''} rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground`}>{children}</code>,
}

export function DocsContent({ sections }: { sections: readonly DocsSection[] }) {
  return <div className="w-full min-w-0 space-y-12 px-0 py-4 sm:px-2 md:px-0 md:py-8">{sections.map(section => <section id={section.id} key={section.id} className="scroll-mt-24"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>{section.content}</ReactMarkdown></section>)}</div>
}
