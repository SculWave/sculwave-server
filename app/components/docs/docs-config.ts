export const docsSections = [
  { id: 'overview', title: 'Overview', icon: 'book' },
  { id: 'features', title: 'Features', icon: 'zap' },
  { id: 'installation', title: 'Installation', icon: 'settings' },
  { id: 'configuration', title: 'Configuration', icon: 'file-text' },
  { id: 'commands', title: 'Commands', icon: 'headphones' },
  { id: 'groups', title: 'Group Chat', icon: 'users' },
  { id: 'network-discovery', title: 'Joining a Network', icon: 'users' },
  { id: 'server-listing', title: 'Server Listing', icon: 'file-text' },
  { id: 'moderation', title: 'Moderation', icon: 'shield' },
  { id: 'support', title: 'Support', icon: 'help-circle' },
] as const

export type DocsNavSection = (typeof docsSections)[number]
export type DocsSection = DocsNavSection & { content: string }
