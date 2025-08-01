import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  try {
    // First, delete all articles (they will be cascade deleted due to foreign key constraint, but being explicit)
    const articlesDeleted = await prisma.article.deleteMany({})
    
    // Then delete all feeds
    const feedsDeleted = await prisma.feed.deleteMany({})
    
    return NextResponse.json({ 
      success: true,
      message: `Cleared ${feedsDeleted.count} feeds and ${articlesDeleted.count} articles`,
      feedsDeleted: feedsDeleted.count,
      articlesDeleted: articlesDeleted.count
    })
  } catch (error) {
    console.error('Error clearing all subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to clear all subscriptions' },
      { status: 500 }
    )
  }
}