import { NextRequest, NextResponse } from 'next/server'
import { markAllFeedArticlesAsRead } from '@/lib/rss-parser'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedId = params.id
    const result = await markAllFeedArticlesAsRead(feedId)
    
    return NextResponse.json({ 
      success: true, 
      message: `Marked ${result.count} articles as read` 
    })
  } catch (error) {
    console.error('Error marking all feed articles as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark articles as read' },
      { status: 500 }
    )
  }
}