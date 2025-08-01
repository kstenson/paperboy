import { NextRequest, NextResponse } from 'next/server'
import { getAllFeeds, addFeed } from '@/lib/rss-parser'

export async function GET() {
  try {
    const feeds = await getAllFeeds()
    return NextResponse.json(feeds)
  } catch (error) {
    console.error('Error fetching feeds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      )
    }

    const feed = await addFeed(url)
    return NextResponse.json(feed, { status: 201 })
  } catch (error) {
    console.error('Error adding feed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to add feed'
    const status = errorMessage.includes('already exists') ? 409 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
}