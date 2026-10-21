'use client'

import { Code } from 'lucide-react'

export function DocsContent() {
  return (
    <div className="w-full min-w-0 space-y-12 px-0 py-4 sm:px-2 md:px-0 md:py-8">    {/* Overview */}
      <section id="overview" className="scroll-mt-24">
        <h1 className="text-4xl font-bold text-foreground">SculWave Documentation</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Learn how to install and configure SculWave Minecraft voice chat for Java and
          Bedrock players. Set up proximity voice, Geyser and Floodgate compatibility,
          multi-server networks, groups, moderation, and supported Minecraft servers.
        </p>
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-semibold text-primary">✨ Powered by LiveKit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Low-latency audio streaming with automatic room switching and spatial awareness.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Features</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: '🎤',
              title: 'Real-time Proximity Voice',
              desc: 'Automatic spatial audio based on player positions',
            },
            { icon: '🌍', title: 'Spatial Audio', desc: 'Distance-aware voice communication' },
            {
              icon: '🔄',
              title: 'Automatic Room Switching',
              desc: 'Seamless voice room switching between servers',
            },
            { icon: '📱', title: 'Companion Clients', desc: 'Android app and web client support' },
            {
              icon: '👥',
              title: 'Group Voice Chat',
              desc: 'Independent of proximity communication',
            },
            {
              icon: '🛡️',
              title: 'Moderation Tools',
              desc: 'Administrator commands and voice bans',
            },
            {
              icon: '🌐',
              title: 'Java & Bedrock Voice Chat',
              desc: 'Geyser and Floodgate compatibility lets Java and Bedrock players communicate together through the same SculWave voice experience.',
            },
            { icon: '🗺️', title: 'Multi-World Aware', desc: 'Different worlds isolated in chat' },
          ].map((feature, i) => (
            <div key={i} className="rounded-lg border border-border bg-card/50 p-4 backdrop-blur">
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="mt-2 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Servers */}
      <section id="installation" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Installation</h2>

        <div className="mt-6">
          <h3 className="text-xl font-semibold text-foreground">Supported Servers</h3>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {['Paper', 'Purpur', 'Pufferfish', 'Spigot', 'Folia'].map(
              (server, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary"></span>
                  {server}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold text-foreground">Network Installation</h3>
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="font-semibold text-amber-600">⚠️ Important</p>
            <p className="mt-2 text-sm text-muted-foreground">
              SculWave is <strong>not</strong> a Velocity plugin. Install SculWave on{' '}
              <strong>every backend Minecraft server</strong> in your network, including servers
              where voice is disabled.
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-lg border border-border bg-card/30 p-4 font-mono text-sm text-muted-foreground">
            <p>Velocity</p>
            <div className="space-y-1 pl-4">
              <p>├── Lobby</p>
              <p>├── Survival</p>
              <p>├── Skyblock</p>
              <p>└── Minigames</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold text-foreground">Setup Steps</h3>
          <ol className="mt-4 space-y-3">
            {[
              'Download the latest SculWave plugin',
              "Copy it into each server's `plugins` folder",
              'Start every server once',
              'Edit the generated configuration',
              'Restart the servers',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-muted-foreground">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Configuration */}
      <section id="configuration" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Configuration</h2>

        <div className="mt-6">
          <h3 className="text-xl font-semibold text-foreground">Config File</h3>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card/50 p-4 backdrop-blur">
            <pre className="font-mono text-sm text-muted-foreground">
              {`activation-key: ""
voice-enabled: true
voice-bans: []`}
            </pre>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">activation-key</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every server in the same network must use the <strong>same activation key</strong>.
              This links all backend servers into a single SculWave network.
            </p>
            <div className="mt-3 rounded-lg border border-border bg-card/30 p-3 font-mono text-sm text-muted-foreground">
              activation-key: YOUR_NETWORK_KEY
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">voice-enabled</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Enable or disable voice chat for a specific server. Players automatically disconnect
              from voice while visiting disabled servers and reconnect when entering voice-enabled
              servers.
            </p>
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-card/30 p-3 font-mono text-sm text-muted-foreground">
              <p># Lobby</p>
              <p>voice-enabled: false</p>
              <p className="mt-2"># Survival</p>
              <p>voice-enabled: true</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold text-foreground">Room Codes</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Each backend server receives its own unique room code. Players only need to connect
            once—SculWave automatically transfers them into the correct voice room when moving
            between servers.
          </p>
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-card/30 p-4 font-mono text-sm text-muted-foreground">
            {['Lobby → ABCD', 'Survival → EFGH', 'Skyblock → IJKL'].map((room, i) => (
              <p key={i}>{room}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Commands */}
      <section id="commands" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Commands</h2>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground">Player Commands</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    /voice command
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { cmd: '/voice', desc: 'Display help' },
                  { cmd: '/voice mute', desc: 'Toggle your microphone' },
                  { cmd: '/voice invite <player>', desc: 'Invite a player to your group' },
                  { cmd: '/voice join <code>', desc: 'Join a group' },
                  { cmd: '/voice leave', desc: 'Leave your group' },
                  { cmd: '/voice members', desc: 'View group members' },
                  { cmd: '/voice kick <player>', desc: 'Remove a member' },
                  { cmd: '/voice transfer <player>', desc: 'Transfer group ownership' },
                ].map((cmd, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-primary">{cmd.cmd}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cmd.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground">Administrator Commands</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Command</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  {
                    cmd: '/voice voiceban <player>',
                    desc: 'Permanently disable voice for a player',
                  },
                  { cmd: '/voice voiceunban <player>', desc: 'Remove a voice ban' },
                  { cmd: '/voice voicecheck <player>', desc: "View a player's voice status" },
                  { cmd: '/voice reload', desc: 'Reload configuration' },
                ].map((cmd, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-primary">{cmd.cmd}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cmd.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground">Permissions</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Permission</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-primary">SculWave.admin</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Access to administrator commands (Default: OP)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Group Chat */}
      <section id="groups" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Group Chat</h2>
        <p className="mt-4 text-muted-foreground">
          Groups allow players to communicate regardless of distance. Players can invite others,
          transfer ownership, and automatically sync across the network.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Player invitations',
            'Automatic group creation',
            'Ownership transfer',
            'Member kicking',
            'Automatic ownership migration',
            'Real-time synchronization',
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/30 p-3"
            >
              <span className="text-primary">✓</span>
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Moderation */}
      <section id="moderation" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Voice Moderation</h2>
        <p className="mt-4 text-muted-foreground">
          Administrators can permanently restrict players from using voice chat through voice bans.
        </p>
        <div className="mt-6 space-y-2 rounded-lg border border-border bg-card/30 p-4">
          {[
            'Voice bans persist across server restarts',
            'Apply across the entire SculWave network',
            'Can be removed at any time',
          ].map((point, i) => (
            <p key={i} className="flex items-center gap-2 text-muted-foreground">
              <span className="text-primary">•</span>
              {point}
            </p>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground">Multi-World Support</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Voice chat only works between players in the same world. This keeps conversations
            natural across multi-world servers.
          </p>
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-card/30 p-4 font-mono text-sm text-muted-foreground">
            <p>
              Lobby ↔ Survival <span className="text-destructive">❌</span>
            </p>
            <p>
              Survival ↔ Skyblock <span className="text-destructive">❌</span>
            </p>
            <p>
              Overworld ↔ Nether <span className="text-destructive">❌</span>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground">
            Java &amp; Bedrock Voice with Geyser &amp; Floodgate
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            SculWave supports Bedrock players on Minecraft servers using Geyser and Floodgate.
            Java and Bedrock players can join the same SculWave voice experience and communicate
            using proximity voice through the same companion application.
          </p>
        </div>
      </section>

      {/* Support */}
      <section id="support" className="scroll-mt-24">
        <h2 className="text-3xl font-bold text-foreground">Requirements & Support</h2>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground">Requirements</h3>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {[
              'Java 21+',
              'Internet connection',
              'SculWave companion app (Android or Web)',
              'SculWave activation key',
            ].map((req, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary"></span>
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-foreground">Need Help?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            If you encounter any issues, please open an issue on GitHub or join the SculWave
            community for support.
          </p>
        </div>
      </section>
    </div>
  )
}
