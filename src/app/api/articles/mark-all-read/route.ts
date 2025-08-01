import { NextResponse } from 'next/server'
import { markAllArticlesAsRead } from '@/lib/rss-parser'

export async function POST() {
  try {
    const result = await markAllArticlesAsRead()
    
    return NextResponse.json({ 
      success: true, 
      message: `Marked ${result.count} articles as read` 
    })
  } catch (error) {
    console.error('Error marking all articles as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all articles as read' },
      { status: 500 }
    )
  }
}