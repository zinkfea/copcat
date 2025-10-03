export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-white">
        <div className="text-center space-y-6">
          <div className="inline-block p-4 bg-white/20 rounded-full">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold">Response Discord Bot</h1>

          <p className="text-lg text-white/90">
            This is a Discord support bot with advanced ticket management and AI-powered responses.
          </p>

          <div className="bg-white/10 rounded-lg p-6 text-left space-y-4">
            <h2 className="text-xl font-semibold">Features</h2>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Multi-category support ticket system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Smart AI assistant with context awareness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Customer review and vouch system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Priority ticket management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Staff notification system</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-sm">
              <strong>Note:</strong> This Discord bot runs on Railway as a Node.js service. Deploy it to Railway to
              start using it with your Discord server.
            </p>
          </div>

          <div className="pt-4">
            <p className="text-sm text-white/70">
              The bot code is in <code className="bg-white/20 px-2 py-1 rounded">scripts/discord-bot.js</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
