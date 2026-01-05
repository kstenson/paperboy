import { StoredFeed } from './storage'

const GIST_FILENAME = 'paperboy-feeds.json'
const GIST_DESCRIPTION = 'Paperboy RSS Reader - Feed Subscriptions'

export interface GistFeed {
  url: string
  title: string
  description?: string
  addedAt: string
}

export interface GistData {
  feeds: GistFeed[]
  version: string
  lastUpdated: string
}

export interface GitHubConfig {
  token: string
  gistId?: string
}

class GitHubSyncService {
  private config: GitHubConfig | null = null
  private readonly STORAGE_KEY = 'paperboy-github-config'

  // Load saved config from localStorage
  loadConfig(): GitHubConfig | null {
    if (typeof window === 'undefined') return null

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (saved) {
        this.config = JSON.parse(saved)
        return this.config
      }
    } catch (error) {
      console.error('Error loading GitHub config:', error)
    }
    return null
  }

  // Save config to localStorage
  saveConfig(config: GitHubConfig): void {
    if (typeof window === 'undefined') return

    this.config = config
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config))
  }

  // Clear saved config
  clearConfig(): void {
    if (typeof window === 'undefined') return

    this.config = null
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // Test GitHub token validity
  async testToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      return response.ok
    } catch (error) {
      console.error('Error testing GitHub token:', error)
      return false
    }
  }

  // Create a new gist with feed data
  async createGist(feeds: StoredFeed[], token: string): Promise<string> {
    const gistData: GistData = {
      feeds: feeds.map(feed => ({
        url: feed.url,
        title: feed.title,
        description: feed.description,
        addedAt: feed.createdAt.toISOString()
      })),
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    }

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(gistData, null, 2)
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create gist: ${error}`)
    }

    const gist = await response.json()
    return gist.id
  }

  // Update existing gist with new feed data
  async updateGist(gistId: string, feeds: StoredFeed[], token: string): Promise<void> {
    const gistData: GistData = {
      feeds: feeds.map(feed => ({
        url: feed.url,
        title: feed.title,
        description: feed.description,
        addedAt: feed.createdAt.toISOString()
      })),
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(gistData, null, 2)
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update gist: ${error}`)
    }
  }

  // Fetch gist data
  async fetchGist(gistId: string, token: string): Promise<GistData> {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch gist: ${error}`)
    }

    const gist = await response.json()
    const fileContent = gist.files[GIST_FILENAME]?.content

    if (!fileContent) {
      throw new Error('Gist does not contain feed data')
    }

    return JSON.parse(fileContent)
  }

  // Push feeds to gist (create or update)
  async pushFeeds(feeds: StoredFeed[]): Promise<void> {
    if (!this.config?.token) {
      throw new Error('GitHub token not configured')
    }

    if (this.config.gistId) {
      // Update existing gist
      await this.updateGist(this.config.gistId, feeds, this.config.token)
    } else {
      // Create new gist
      const gistId = await this.createGist(feeds, this.config.token)
      this.config.gistId = gistId
      this.saveConfig(this.config)
    }
  }

  // Pull feeds from gist
  async pullFeeds(): Promise<GistFeed[]> {
    if (!this.config?.token || !this.config?.gistId) {
      throw new Error('GitHub sync not configured')
    }

    const gistData = await this.fetchGist(this.config.gistId, this.config.token)
    return gistData.feeds
  }

  // Check if sync is configured
  isConfigured(): boolean {
    return !!(this.config?.token && this.config?.gistId)
  }

  // Get current config
  getConfig(): GitHubConfig | null {
    return this.config
  }
}

export const githubSync = new GitHubSyncService()
