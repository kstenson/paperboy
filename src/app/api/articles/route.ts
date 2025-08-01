import { NextRequest, NextResponse } from 'next/server'
import { getFeedArticles, getUnreadArticles } from '@/lib/rss-parser'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get('feedId')
    
    let articles
    if (feedId) {
      articles = await getFeedArticles(feedId)
    } else {
      articles = await getUnreadArticles()
    }
    
    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}