'use client'

import { ExternalLink, Eye, EyeOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
}

export default function ArticleContent({ article, onMarkAsRead }: ArticleContentProps) {
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

  return (
    <div className="article-content">
      <div className="border-b border-google-reader-border dark:border-google-reader-border-dark p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{article.feed.title}</span>
              <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
            </div>
          </div>
          
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
      
      <div className="p-6">
        <div 
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  )
}