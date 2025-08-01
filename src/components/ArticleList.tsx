'use client'

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

interface ArticleListProps {
  articles: Article[]
  selectedArticleId?: string
  onArticleSelect: (article: Article) => void
}

export default function ArticleList({ articles, selectedArticleId, onArticleSelect }: ArticleListProps) {
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').substring(0, 150) + (html.length > 150 ? '...' : '')
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
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {articles.map((article) => (
          <div
            key={article.id}
            onClick={() => onArticleSelect(article)}
            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              selectedArticleId === article.id ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-500 dark:border-blue-400' : ''
            } ${!article.isRead ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700 opacity-75'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className={`font-medium text-sm leading-tight ${
                !article.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {article.title}
              </h3>
              {!article.isRead && (
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full ml-2 mt-1 flex-shrink-0" />
              )}
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
        ))}
      </div>
    </div>
  )
}