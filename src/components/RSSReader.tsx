'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ArticleList from './ArticleList'
import ArticleContent from './ArticleContent'
import ToastContainer, { Toast } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import { useTheme } from '../contexts/ThemeContext'
import * as clientRss from '../lib/clientRssParser'
import { StoredFeed, StoredArticle, storage } from '../lib/storage'
import { updateLastVisitTime } from '../lib/dateFilters'
import { githubSync } from '../lib/githubSync'

interface Feed extends StoredFeed {
  _count: {
    articles: number
  }
}

interface Article extends StoredArticle {
  feed: {
    title: string
    url: string
  }
}

interface RSSReaderProps {
  initialFeedId?: string
  initialArticleId?: string
}

export default function RSSReader({ initialFeedId, initialArticleId }: RSSReaderProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)
  const { isDarkMode, toggleDarkMode, autoFetchContent, toggleAutoFetchContent } = useTheme()

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const fetchFeeds = async () => {
    try {
      console.log('Fetching feeds...')
      const data = clientRss.getAllFeeds()
      console.log('Feeds fetched:', data.length, 'feeds')
      setFeeds(data)
    } catch (error) {
      console.error('Error fetching feeds:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Feeds',
        message: 'Failed to load feeds. Please refresh the page.'
      })
    }
  }

  const fetchArticles = async (feedId?: string | null) => {
    try {
      console.log('Fetching articles for feedId:', feedId)
      const rawArticles = feedId ? clientRss.getFeedArticles(feedId) : clientRss.getAllArticles()

      // Get fresh feed data directly instead of relying on state
      const currentFeeds = clientRss.getAllFeeds()

      // Convert to the expected format with feed information
      const data = rawArticles.map(article => {
        const feed = currentFeeds.find(f => f.id === article.feedId)
        return {
          ...article,
          feed: {
            title: feed?.title || 'Unknown Feed',
            url: feed?.url || ''
          }
        }
      })

      console.log('Articles fetched:', data.length, 'articles')
      setArticles(data)
    } catch (error) {
      console.error('Error fetching articles:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Articles',
        message: 'Failed to load articles. Please try again.'
      })
    }
  }

  const handleAddFeed = async (url: string) => {
    try {
      console.log('Adding feed:', url)
      
      await clientRss.addFeed(url)
      console.log('Feed added successfully, refreshing data...')
      
      // Refresh feeds and articles
      await fetchFeeds()
      await fetchArticles(selectedFeedId)
      
      addToast({
        type: 'success',
        title: 'Feed Added',
        message: 'RSS feed has been added successfully!'
      })
      
      console.log('Data refresh completed after adding feed')
    } catch (error) {
      console.error('Error adding feed:', error)
      addToast({
        type: 'error',
        title: 'Failed to Add Feed',
        message: error instanceof Error ? error.message : 'Failed to add feed'
      })
    }
  }

  const handleFeedSelect = (feedId: string | null) => {
    setSelectedFeedId(feedId)
    setSelectedArticle(null)
    fetchArticles(feedId)
    
    // Update URL hash for client-side routing
    if (feedId) {
      window.location.hash = `feed=${feedId}`
    } else {
      window.location.hash = ''
    }
  }

  const handleArticleSelect = async (article: Article) => {
    setSelectedArticle(article)
    
    // Update URL hash with article selection
    if (selectedFeedId) {
      window.location.hash = `feed=${selectedFeedId}&article=${article.id}`
    } else {
      window.location.hash = `article=${article.id}`
    }
    
    if (!article.isRead) {
      try {
        clientRss.markArticleAsRead(article.id, true)
        
        setArticles(prev => prev.map(a => 
          a.id === article.id ? { ...a, isRead: true } : a
        ))
        
        setSelectedArticle(prev => prev ? { ...prev, isRead: true } : null)
        
        await fetchFeeds()
      } catch (error) {
        console.error('Error marking article as read:', error)
      }
    }
  }

  const handleMarkAsRead = async (articleId: string, isRead: boolean) => {
    try {
      clientRss.markArticleAsRead(articleId, isRead)
      
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, isRead } : a
      ))
      
      if (selectedArticle?.id === articleId) {
        setSelectedArticle(prev => prev ? { ...prev, isRead } : null)
      }
      
      await fetchFeeds()
    } catch (error) {
      console.error('Error updating article read status:', error)
    }
  }

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true)
    try {
      await clientRss.updateAllFeeds()
      
      await fetchFeeds()
      await fetchArticles(selectedFeedId)
    } catch (error) {
      console.error('Error refreshing feeds:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAllAsRead = async (feedId?: string) => {
    try {
      if (feedId) {
        clientRss.markAllFeedArticlesAsRead(feedId)
      } else {
        clientRss.markAllArticlesAsRead()
      }
      
      await fetchFeeds()
      await fetchArticles(selectedFeedId)
      
      setArticles(prev => prev.map(article => ({ ...article, isRead: true })))
      
      if (selectedArticle) {
        setSelectedArticle(prev => prev ? { ...prev, isRead: true } : null)
      }
    } catch (error) {
      console.error('Error marking articles as read:', error)
    }
  }

  const handleImportOPML = async (file: File) => {
    setIsImporting(true)
    
    // Show initial import toast
    addToast({
      type: 'info',
      title: 'OPML Import Started',
      message: `Importing feeds from ${file.name}...`,
      duration: 3000
    })
    
    try {
      const text = await file.text()
      const result = await clientRss.importOPML(text)
      
      const successMessage = `${result.success} feeds added successfully`
      const failMessage = result.failed > 0 ? ` (${result.failed} failed)` : ''
      
      // Force refresh the data
      console.log('Import successful, refreshing data...')
      
      // First refresh feeds
      await fetchFeeds()
      
      // Then refresh articles for current view
      await fetchArticles(selectedFeedId)
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'OPML Import Completed',
        message: successMessage + failMessage,
        duration: 6000
      })
      
      // Show individual error toasts for failed imports
      if (result.errors.length > 0 && result.errors.length <= 3) {
        result.errors.forEach((error: string) => {
          addToast({
            type: 'error',
            title: 'Import Warning',
            message: error,
            duration: 8000
          })
        })
      }
      
      console.log('Data refresh completed after import')
    } catch (error) {
      console.error('Error importing OPML:', error)
      addToast({
        type: 'error',
        title: 'Import Error',
        message: 'Failed to import OPML file. Please try again.'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportOPML = async () => {
    try {
      const opmlContent = clientRss.exportOPML()
      const blob = new Blob([opmlContent], { type: 'text/xml' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rss-subscriptions.opml'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      addToast({
        type: 'success',
        title: 'Export Successful',
        message: 'OPML file has been downloaded successfully'
      })
    } catch (error) {
      console.error('Error exporting OPML:', error)
      addToast({
        type: 'error',
        title: 'Export Error',
        message: 'Failed to export OPML file. Please try again.'
      })
    }
  }

  const handleClearAll = () => {
    setShowClearAllDialog(true)
  }

  const handleConfirmClearAll = async () => {
    try {
      clientRss.clearAllFeeds()

      // Clear local state
      setFeeds([])
      setArticles([])
      setSelectedFeedId(null)
      setSelectedArticle(null)

      addToast({
        type: 'success',
        title: 'All Subscriptions Cleared',
        message: 'All feeds and articles have been removed successfully'
      })
    } catch (error) {
      console.error('Error clearing all subscriptions:', error)
      addToast({
        type: 'error',
        title: 'Clear Error',
        message: 'Failed to clear all subscriptions. Please try again.'
      })
    }
  }

  const handleGitHubSync = async () => {
    try {
      // Get current feeds
      const localFeeds = storage.getAllFeeds()

      // First, push local feeds to gist
      await githubSync.pushFeeds(localFeeds)

      // Then pull feeds from gist and merge
      const gistFeeds = await githubSync.pullFeeds()

      // Add any feeds from gist that don't exist locally
      let addedCount = 0
      for (const gistFeed of gistFeeds) {
        const exists = localFeeds.some(f => f.url === gistFeed.url)
        if (!exists) {
          try {
            await clientRss.addFeed(gistFeed.url)
            addedCount++
          } catch (error) {
            console.error(`Failed to add feed ${gistFeed.url}:`, error)
          }
        }
      }

      // Refresh local data
      await fetchFeeds()
      await fetchArticles(selectedFeedId)

      if (addedCount > 0) {
        addToast({
          type: 'success',
          title: 'Sync Completed',
          message: `Synced with GitHub. ${addedCount} new feed${addedCount !== 1 ? 's' : ''} added from gist.`
        })
      } else {
        addToast({
          type: 'success',
          title: 'Sync Completed',
          message: 'All feeds are in sync with GitHub.'
        })
      }
    } catch (error) {
      console.error('Error syncing with GitHub:', error)
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: error instanceof Error ? error.message : 'Failed to sync with GitHub'
      })
      throw error // Re-throw so the UI component can handle it
    }
  }

  useEffect(() => {
    const parseUrlHash = () => {
      if (typeof window === 'undefined') return { feedId: null, articleId: null }
      
      const hash = window.location.hash.slice(1) // Remove the #
      const params = new URLSearchParams(hash)
      
      return {
        feedId: params.get('feed'),
        articleId: params.get('article')
      }
    }
    
    const loadData = async () => {
      setLoading(true)
      await fetchFeeds()
      
      // Parse URL hash or use props
      const urlParams = parseUrlHash()
      const targetFeedId = initialFeedId || urlParams.feedId
      const targetArticleId = initialArticleId || urlParams.articleId
      
      // Set initial feed selection
      if (targetFeedId) {
        setSelectedFeedId(targetFeedId)
        await fetchArticles(targetFeedId)
      } else {
        await fetchArticles()
      }
      
      // Set initial article selection if specified
      if (targetArticleId) {
        // Will be handled by the existing article selection effect
      }
      
      // Update last visited time
      updateLastVisitTime()
      
      setLoading(false)
    }
    
    loadData()
    
    // Listen for hash changes
    const handleHashChange = () => {
      const { feedId, articleId } = parseUrlHash()
      
      if (feedId !== selectedFeedId) {
        setSelectedFeedId(feedId)
        fetchArticles(feedId)
        setSelectedArticle(null)
      }
      
      // Article selection will be handled by finding in current articles
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [initialFeedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle initial article selection
  useEffect(() => {
    if (initialArticleId && articles.length > 0) {
      const article = articles.find(a => a.id === initialArticleId)
      if (article) {
        setSelectedArticle(article)
        
        // Mark as read if not already
        if (!article.isRead) {
          try {
            clientRss.markArticleAsRead(article.id, true)
          } catch (error) {
            console.error('Error marking article as read:', error)
          }
        }
      }
    }
  }, [initialArticleId, articles])

  if (loading) {
    return (
      <div className="google-reader-layout">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-reader-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Paperboy...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="google-reader-layout">
        <Sidebar
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          onFeedSelect={handleFeedSelect}
          onAddFeed={handleAddFeed}
          onRefreshFeeds={handleRefreshFeeds}
          onMarkAllAsRead={handleMarkAllAsRead}
          onImportOPML={handleImportOPML}
          onExportOPML={handleExportOPML}
          onClearAll={handleClearAll}
          onGitHubSync={handleGitHubSync}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          autoFetchContent={autoFetchContent}
          onToggleAutoFetchContent={toggleAutoFetchContent}
          isRefreshing={isRefreshing}
          isImporting={isImporting}
        />
        
        <ArticleList 
          articles={articles}
          selectedArticleId={selectedArticle?.id}
          onArticleSelect={handleArticleSelect}
        />
        
        <ArticleContent 
          article={selectedArticle}
          onMarkAsRead={handleMarkAsRead}
          autoFetchContent={autoFetchContent}
        />
      </div>
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <ConfirmDialog
        isOpen={showClearAllDialog}
        onClose={() => setShowClearAllDialog(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear All Subscriptions"
        message={`Are you sure you want to remove all ${feeds.length} feed${feeds.length !== 1 ? 's' : ''} and their articles? This action cannot be undone.`}
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
      />
    </>
  )
}