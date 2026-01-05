'use client'

import { useState, useEffect } from 'react'
import { Github, Check, X, RefreshCw, LogOut, ExternalLink } from 'lucide-react'
import { githubSync } from '../lib/githubSync'

interface GitHubSyncSettingsProps {
  onSync: () => void
}

export default function GitHubSyncSettings({ onSync }: GitHubSyncSettingsProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [token, setToken] = useState('')
  const [gistId, setGistId] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const config = githubSync.loadConfig()
    if (config) {
      setIsConnected(true)
      setGistId(config.gistId || '')
    }
  }, [])

  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token')
      return
    }

    setIsConnecting(true)
    setError(null)
    setSuccess(null)

    try {
      // Test token validity
      const isValid = await githubSync.testToken(token)
      if (!isValid) {
        throw new Error('Invalid GitHub token')
      }

      // Save config
      githubSync.saveConfig({ token, gistId: gistId || undefined })
      setIsConnected(true)
      setSuccess('Connected to GitHub successfully!')
      setToken('') // Clear token from input for security
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    githubSync.clearConfig()
    setIsConnected(false)
    setToken('')
    setGistId('')
    setSuccess('Disconnected from GitHub')
    setError(null)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      await onSync()
      setSuccess('Feeds synced successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">GitHub Sync</h3>
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sync your feed subscriptions to a private GitHub Gist for backup and cross-device access.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <a
              href="https://github.com/settings/tokens/new?description=Paperboy%20RSS%20Reader&scopes=gist"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              Create a token with &apos;gist&apos; scope
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Existing Gist ID (optional)
            </label>
            <input
              type="text"
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              placeholder="Leave empty to create new gist"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If you already have a gist, enter its ID to use it
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="w-4 h-4" />
                Connect GitHub
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            Connected to GitHub
          </div>

          {gistId && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Gist ID:</span>{' '}
              <a
                href={`https://gist.github.com/${gistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {gistId.substring(0, 8)}...
              </a>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </>
            )}
          </button>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="font-medium mb-1">What gets synced:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Feed URLs and titles</li>
          <li>Feed descriptions</li>
        </ul>
        <p className="mt-2 font-medium mb-1">What stays local:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Articles and read status</li>
          <li>User preferences</li>
        </ul>
      </div>
    </div>
  )
}
