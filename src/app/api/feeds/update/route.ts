import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateFeed } from '@/lib/rss-parser'

export async function POST() {
  try {
    const feeds = await prisma.feed.findMany()
    const updatePromises = feeds.map(feed => updateFeed(feed.id))
    
    await Promise.allSettled(updatePromises)
    
    return NextResponse.json({ 
      message: `Updated ${feeds.length} feeds`,
      count: feeds.length 
    })
  } catch (error) {
    console.error('Error updating feeds:', error)
    return NextResponse.json(
      { error: 'Failed to update feeds' },
      { status: 500 }
    )
  }
}