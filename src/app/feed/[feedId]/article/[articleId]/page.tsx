'use client'

import { useParams } from 'next/navigation'
import RSSReader from '@/components/RSSReader'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function ArticlePage() {
  const params = useParams()
  const feedId = params.feedId as string
  const articleId = params.articleId as string

  return (
    <ThemeProvider>
      <RSSReader initialFeedId={feedId} initialArticleId={articleId} />
    </ThemeProvider>
  )
}