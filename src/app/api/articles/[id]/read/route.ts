import { NextRequest, NextResponse } from 'next/server'
import { markArticleAsRead } from '@/lib/rss-parser'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id
    await markArticleAsRead(articleId, true)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking article as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark article as read' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id
    await markArticleAsRead(articleId, false)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking article as unread:', error)
    return NextResponse.json(
      { error: 'Failed to mark article as unread' },
      { status: 500 }
    )
  }
}