'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ArticleList from './ArticleList'
import ArticleContent from './ArticleContent'
import ToastContainer, { Toast } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import { useTheme } from '../contexts/ThemeContext'

interface Feed {
  id: string
  title: string
  url: string
  _count: {
    articles: number
  }
}

interface Article {
  id: string
  title: string
  content: string
  url: string
  pubDate: Date
  isRead: boolean
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
      const response = await fetch('/api/feeds')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
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
      const url = feedId ? `/api/articles?feedId=${feedId}` : '/api/articles'
      console.log('Fetching articles from:', url)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
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
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add feed')
      }
      
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
    
    // Update URL
    if (feedId) {
      router.push(`/feed/${feedId}`)
    } else {
      router.push('/')
    }
  }

  const handleArticleSelect = async (article: Article) => {
    setSelectedArticle(article)
    
    // Update URL with article selection
    if (selectedFeedId) {
      router.push(`/feed/${selectedFeedId}/article/${article.id}`)
    }
    
    if (!article.isRead) {
      try {
        await fetch(`/api/articles/${article.id}/read`, {
          method: 'POST',
        })
        
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
      const response = await fetch(`/api/articles/${articleId}/read`, {
        method: isRead ? 'POST' : 'DELETE',
      })
      
      if (response.ok) {
        setArticles(prev => prev.map(a => 
          a.id === articleId ? { ...a, isRead } : a
        ))
        
        if (selectedArticle?.id === articleId) {
          setSelectedArticle(prev => prev ? { ...prev, isRead } : null)
        }
        
        await fetchFeeds()
      }
    } catch (error) {
      console.error('Error updating article read status:', error)
    }
  }

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true)
    try {
      await fetch('/api/feeds/update', {
        method: 'POST',
      })
      
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
        await fetch(`/api/feeds/${feedId}/mark-read`, {
          method: 'POST',
        })
      } else {
        await fetch('/api/articles/mark-all-read', {
          method: 'POST',
        })
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
      const formData = new FormData()
      formData.append('opmlFile', file)
      
      const response = await fetch('/api/feeds/import-opml', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (response.ok) {
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
      } else {
        addToast({
          type: 'error',
          title: 'Import Failed',
          message: result.error
        })
      }
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
      const response = await fetch('/api/feeds/export-opml')
      
      if (response.ok) {
        const blob = await response.blob()
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
      } else {
        const error = await response.json()
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: error.error
        })
      }
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
      const response = await fetch('/api/feeds/clear-all', {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Clear local state
        setFeeds([])
        setArticles([])
        setSelectedFeedId(null)
        setSelectedArticle(null)
        
        addToast({
          type: 'success',
          title: 'All Subscriptions Cleared',
          message: result.message
        })
      } else {
        addToast({
          type: 'error',
          title: 'Clear Failed',
          message: result.error || 'Failed to clear all subscriptions'
        })
      }
    } catch (error) {
      console.error('Error clearing all subscriptions:', error)
      addToast({
        type: 'error',
        title: 'Clear Error',
        message: 'Failed to clear all subscriptions. Please try again.'
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchFeeds()
      
      // Set initial feed selection
      if (initialFeedId) {
        setSelectedFeedId(initialFeedId)
        await fetchArticles(initialFeedId)
      } else {
        await fetchArticles()
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [initialFeedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle initial article selection
  useEffect(() => {
    if (initialArticleId && articles.length > 0) {
      const article = articles.find(a => a.id === initialArticleId)
      if (article) {
        setSelectedArticle(article)
        
        // Mark as read if not already
        if (!article.isRead) {
          fetch(`/api/articles/${article.id}/read`, {
            method: 'POST',
          }).catch(error => {
            console.error('Error marking article as read:', error)
          })
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
            <p className="text-gray-600">Loading RSS Reader...</p>
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