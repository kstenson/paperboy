'use client'

import { useParams } from 'next/navigation'
import RSSReader from '@/components/RSSReader'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function FeedPage() {
  const params = useParams()
  const feedId = params.feedId as string

  return (
    <ThemeProvider>
      <RSSReader initialFeedId={feedId} />
    </ThemeProvider>
  )
}