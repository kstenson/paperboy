'use client'

import { ExternalLink, Eye, EyeOff, MessageCircle, FileText, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

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

interface ArticleContentProps {
  article: Article | null
  onMarkAsRead: (articleId: string, isRead: boolean) => void
  autoFetchContent: boolean
}

export default function ArticleContent({ article, onMarkAsRead, autoFetchContent }: ArticleContentProps) {
  const [fetchedContent, setFetchedContent] = useState<{title: string, content: string} | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasAutoFetched, setHasAutoFetched] = useState<string | null>(null) // Track which article we've auto-fetched

  // Reset all state when article changes
  useEffect(() => {
    console.log('Article changed to:', article?.id, article?.title)
    setFetchedContent(null)
    setFetchError(null)
    setIsFetching(false)
    setHasAutoFetched(null)
  }, [article?.id])

  // Auto-fetch content when conditions are met (with debounce to handle rapid article switching)
  useEffect(() => {
    // Debounce the auto-fetch to prevent issues with rapid article switching
    const timer = setTimeout(() => {
      if (!article || !autoFetchContent || isFetching || fetchedContent) {
        return
      }

      // Don't auto-fetch if we've already tried for this article
      if (hasAutoFetched === article.id) {
        console.log('Already auto-fetched for article:', article.id)
        return
      }
      
      const contentType = getContentType(article.content)
      const shouldAutoFetch = contentType === 'summary' || contentType === 'link'
      
      console.log('Auto-fetch evaluation (after debounce):', {
        articleId: article.id,
        title: article.title.substring(0, 50),
        contentType,
        shouldAutoFetch,
        autoFetchContent,
        hasAutoFetched: hasAutoFetched === article.id,
        fetchedContent: !!fetchedContent,
        isFetching
      })
      
      if (shouldAutoFetch) {
        console.log('🚀 Auto-fetching content for:', article.title)
        setHasAutoFetched(article.id)
        handleFetchFullContent()
      }
    }, 300) // 300ms debounce to allow article switching to settle

    return () => clearTimeout(timer)
  }, [article, autoFetchContent, isFetching, fetchedContent, hasAutoFetched]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!article) {
    return (
      <div className="article-content">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">Select an article to read</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Choose an article from the list to view its content</p>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleRead = () => {
    onMarkAsRead(article.id, !article.isRead)
  }

  const handleShareToChatGPT = () => {
    // Use fetched content if available, otherwise use original
    const contentToShare = fetchedContent ? fetchedContent.content : article.content
    const textContent = contentToShare.replace(/<[^>]*>/g, '').trim()
    const titleToShare = fetchedContent ? fetchedContent.title : article.title
    
    const prompt = `Please analyze this article:\n\nTitle: ${titleToShare}\nSource: ${article.feed.title}\nURL: ${article.url}\n\nContent:\n${textContent}`
    
    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt)
    
    // Open ChatGPT with pre-filled content
    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`
    window.open(chatGPTUrl, '_blank', 'noopener,noreferrer')
  }

  const getContentType = (content: string) => {
    const textContent = content.replace(/<[^>]*>/g, '').trim()
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length
    
    // Check for common truncation indicators at the end of content
    const endsWithTruncation = /(\.\.\.|read\s+more|continue\s+reading|view\s+full|see\s+more|full\s+post)[\s\S]*$/i.test(textContent.slice(-100))
    
    // Check for very obvious link-only indicators
    const isLinkOnly = wordCount < 30 || 
      /^(read\s+more|full\s+article|view\s+original|continue\s+reading)/i.test(textContent.trim()) ||
      textContent.length < 200
    
    if (isLinkOnly) {
      return 'link'
    }
    
    // If content ends with truncation indicators and is under 200 words, it's likely a summary
    if (endsWithTruncation && wordCount < 200) {
      return 'summary'
    }
    
    // Full article: Longer content (> 150 words) without clear truncation
    if (wordCount > 150 && !endsWithTruncation) {
      return 'full'
    }
    
    // Summary: Medium length content (30-150 words) or content with truncation indicators
    return 'summary'
  }

  const handleFetchFullContent = async () => {
    setIsFetching(true)
    setFetchError(null)
    
    try {
      const response = await fetch('/api/articles/fetch-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: article.url }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setFetchedContent({
          title: result.title,
          content: result.content
        })
      } else {
        setFetchError(result.error || 'Failed to fetch content')
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      setFetchError('Failed to fetch content')
    } finally {
      setIsFetching(false)
    }
  }

  const contentType = getContentType(article.content)
  const showFetchButton = contentType === 'summary' || contentType === 'link'

  return (
    <div className="article-content">
      <div className="p-4 border-b border-google-reader-border dark:border-google-reader-border-dark">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {fetchedContent ? fetchedContent.title : article.title}
          </h1>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleToggleRead}
              className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                article.isRead ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500 dark:text-blue-400'
              }`}
              title={article.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {article.isRead ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            
            {showFetchButton && !fetchedContent && (
              <button
                onClick={handleFetchFullContent}
                disabled={isFetching}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title="Fetch full content"
              >
                {isFetching ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </button>
            )}
            
            <button
              onClick={handleShareToChatGPT}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Share with ChatGPT"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-google-reader-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Open original article"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      
      {/* Article metadata below divider */}
      <div className="p-4 border-b border-google-reader-border dark:border-google-reader-border-dark">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{article.feed.title}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
        </div>
      </div>
      
      <div className="p-6">
        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-red-700 dark:text-red-400 text-sm">
              Failed to fetch full content: {fetchError}
            </p>
          </div>
        )}
        
        {fetchedContent && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-blue-700 dark:text-blue-400 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Showing full content fetched from original article
            </p>
          </div>
        )}
        
        <div 
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: fetchedContent ? fetchedContent.content : article.content 
          }}
        />
      </div>
    </div>
  )
}