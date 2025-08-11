'use client'

import { formatDistanceToNow } from 'date-fns'
import { FileText, MessageSquare, ExternalLink } from 'lucide-react'

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

interface ArticleListProps {
  articles: Article[]
  selectedArticleId?: string
  onArticleSelect: (article: Article) => void
}

export default function ArticleList({ articles, selectedArticleId, onArticleSelect }: ArticleListProps) {
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').substring(0, 150) + (html.length > 150 ? '...' : '')
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

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'full':
        return <FileText className="w-3 h-3 text-green-500 dark:text-green-400" />
      case 'summary':
        return <MessageSquare className="w-3 h-3 text-blue-500 dark:text-blue-400" />
      case 'link':
        return <ExternalLink className="w-3 h-3 text-orange-500 dark:text-orange-400" />
      default:
        return null
    }
  }

  const getContentTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'full':
        return 'Full Article'
      case 'summary':
        return 'Summary'
      case 'link':
        return 'Link Only'
      default:
        return ''
    }
  }

  if (articles.length === 0) {
    return (
      <div className="article-list">
        <div className="p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center">No articles to display</p>
        </div>
      </div>
    )
  }

  return (
    <div className="article-list">
      <div className="p-4 border-b border-google-reader-border dark:border-google-reader-border-dark">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {articles.map((article) => {
          const contentType = getContentType(article.content)
          return (
            <div
              key={article.id}
              onClick={() => onArticleSelect(article)}
              className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedArticleId === article.id ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-500 dark:border-blue-400' : ''
              } ${!article.isRead ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700 opacity-75'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <h3 className={`font-medium text-sm leading-tight ${
                    !article.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {article.title}
                  </h3>
                  <div 
                    className="flex-shrink-0 mt-0.5"
                    title={getContentTypeLabel(contentType)}
                  >
                    {getContentIcon(contentType)}
                  </div>
                </div>
                <div className="flex items-start gap-2 ml-2">
                  {!article.isRead && (
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-1 flex-shrink-0" />
                  )}
                </div>
              </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="font-medium">{article.feed.title}</span>
              <span className="mx-1">•</span>
              <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
            </div>
            
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {stripHtml(article.content)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}