import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateFeed } from '@/lib/rss-parser'
import { logger } from '@/lib/logger'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit: 5 updates per 5 minutes (updating all feeds is expensive)
  const rateLimitResult = checkRateLimit(request, { maxRequests: 5, windowSeconds: 300 })
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  try {
    const feeds = await prisma.feed.findMany()
    const updatePromises = feeds.map(feed => updateFeed(feed.id))
    
    await Promise.allSettled(updatePromises)
    
    return NextResponse.json({ 
      message: `Updated ${feeds.length} feeds`,
      count: feeds.length 
    })
  } catch (error) {
    logger.error('Error updating feeds', error)
    return NextResponse.json(
      { error: 'Failed to update feeds' },
      { status: 500 }
    )
  }
}