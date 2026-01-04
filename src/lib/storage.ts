export interface StoredFeed {
  id: string
  title: string
  url: string
  description?: string
  favicon?: string
  createdAt: Date
  updatedAt: Date
}

export interface StoredArticle {
  id: string
  feedId: string
  title: string
  content: string
  url: string
  pubDate: Date
  isRead: boolean
  createdAt: Date
  // Podcast-specific fields (optional)
  mediaType?: 'article' | 'podcast'
  audioUrl?: string
  transcript?: string
  duration?: number  // in seconds
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  autoFetchContent: boolean
  lastVisited: Date
}

export interface AppData {
  feeds: StoredFeed[]
  articles: StoredArticle[]
  preferences: UserPreferences
  version: string
}

const STORAGE_KEY = 'paperboy-data'
const CURRENT_VERSION = '1.1.0'

const DEFAULT_DATA: AppData = {
  feeds: [],
  articles: [],
  preferences: {
    theme: 'light',
    autoFetchContent: false,
    lastVisited: new Date()
  },
  version: CURRENT_VERSION
}

export class Storage {
  private static instance: Storage
  private data: AppData

  private constructor() {
    this.data = this.loadFromStorage()
  }

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage()
    }
    return Storage.instance
  }

  private loadFromStorage(): AppData {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_DATA }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { ...DEFAULT_DATA }
      }

      const parsed = JSON.parse(stored)
      
      // Convert date strings back to Date objects
      if (parsed.feeds) {
        parsed.feeds = parsed.feeds.map((feed: any) => ({
          ...feed,
          createdAt: new Date(feed.createdAt),
          updatedAt: new Date(feed.updatedAt)
        }))
      }

      if (parsed.articles) {
        parsed.articles = parsed.articles.map((article: any) => ({
          ...article,
          pubDate: new Date(article.pubDate),
          createdAt: new Date(article.createdAt)
        }))
      }

      if (parsed.preferences?.lastVisited) {
        parsed.preferences.lastVisited = new Date(parsed.preferences.lastVisited)
      }

      return {
        ...DEFAULT_DATA,
        ...parsed
      }
    } catch (error) {
      console.error('Error loading data from storage:', error)
      return { ...DEFAULT_DATA }
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch (error) {
      console.error('Error saving data to storage:', error)
    }
  }

  // Feed operations
  getAllFeeds(): StoredFeed[] {
    return this.data.feeds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  addFeed(feed: Omit<StoredFeed, 'id' | 'createdAt' | 'updatedAt'>): StoredFeed {
    const newFeed: StoredFeed = {
      ...feed,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Check if feed already exists
    const exists = this.data.feeds.some(f => f.url === feed.url)
    if (exists) {
      throw new Error('Feed already exists')
    }

    this.data.feeds.push(newFeed)
    this.saveToStorage()
    return newFeed
  }

  updateFeed(id: string, updates: Partial<StoredFeed>): StoredFeed | null {
    const index = this.data.feeds.findIndex(f => f.id === id)
    if (index === -1) return null

    this.data.feeds[index] = {
      ...this.data.feeds[index],
      ...updates,
      updatedAt: new Date()
    }
    this.saveToStorage()
    return this.data.feeds[index]
  }

  deleteFeed(id: string): boolean {
    const feedIndex = this.data.feeds.findIndex(f => f.id === id)
    if (feedIndex === -1) return false

    // Remove feed and its articles
    this.data.feeds.splice(feedIndex, 1)
    this.data.articles = this.data.articles.filter(a => a.feedId !== id)
    this.saveToStorage()
    return true
  }

  clearAllFeeds(): void {
    this.data.feeds = []
    this.data.articles = []
    this.saveToStorage()
  }

  // Article operations
  getAllArticles(limit = 100): StoredArticle[] {
    return this.data.articles
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
      .slice(0, limit)
  }

  getFeedArticles(feedId: string, limit = 50): StoredArticle[] {
    return this.data.articles
      .filter(a => a.feedId === feedId)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
      .slice(0, limit)
  }

  getUnreadArticles(limit = 100): StoredArticle[] {
    return this.data.articles
      .filter(a => !a.isRead)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
      .slice(0, limit)
  }

  getArticlesSinceLastVisit(): StoredArticle[] {
    const lastVisited = this.data.preferences.lastVisited
    return this.data.articles
      .filter(a => a.pubDate > lastVisited)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
  }

  addArticle(article: Omit<StoredArticle, 'id' | 'createdAt'>): StoredArticle {
    // Check if article already exists
    const exists = this.data.articles.some(a => a.url === article.url)
    if (exists) {
      return this.data.articles.find(a => a.url === article.url)!
    }

    const newArticle: StoredArticle = {
      ...article,
      id: this.generateId(),
      createdAt: new Date()
    }

    this.data.articles.push(newArticle)
    this.saveToStorage()
    return newArticle
  }

  updateArticle(id: string, updates: Partial<StoredArticle>): StoredArticle | null {
    const index = this.data.articles.findIndex(a => a.id === id)
    if (index === -1) return null

    this.data.articles[index] = { ...this.data.articles[index], ...updates }
    this.saveToStorage()
    return this.data.articles[index]
  }

  markArticleAsRead(id: string, isRead = true): StoredArticle | null {
    return this.updateArticle(id, { isRead })
  }

  markAllFeedArticlesAsRead(feedId: string): void {
    this.data.articles = this.data.articles.map(article =>
      article.feedId === feedId ? { ...article, isRead: true } : article
    )
    this.saveToStorage()
  }

  markAllArticlesAsRead(): void {
    this.data.articles = this.data.articles.map(article => ({ ...article, isRead: true }))
    this.saveToStorage()
  }

  // Preferences operations
  getPreferences(): UserPreferences {
    return this.data.preferences
  }

  updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    this.data.preferences = { ...this.data.preferences, ...updates }
    this.saveToStorage()
    return this.data.preferences
  }

  updateLastVisited(): void {
    this.data.preferences.lastVisited = new Date()
    this.saveToStorage()
  }

  // Utility operations
  getFeedWithArticleCount(feedId: string): (StoredFeed & { _count: { articles: number } }) | null {
    const feed = this.data.feeds.find(f => f.id === feedId)
    if (!feed) return null

    const unreadCount = this.data.articles.filter(a => a.feedId === feedId && !a.isRead).length
    return {
      ...feed,
      _count: { articles: unreadCount }
    }
  }

  getAllFeedsWithCounts(): (StoredFeed & { _count: { articles: number } })[] {
    return this.data.feeds.map(feed => {
      const unreadCount = this.data.articles.filter(a => a.feedId === feed.id && !a.isRead).length
      return {
        ...feed,
        _count: { articles: unreadCount }
      }
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  exportData(): AppData {
    return { ...this.data }
  }

  importData(data: Partial<AppData>): void {
    this.data = {
      ...this.data,
      ...data,
      version: CURRENT_VERSION
    }
    this.saveToStorage()
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export const storage = Storage.getInstance()