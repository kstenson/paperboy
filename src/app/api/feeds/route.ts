import { NextRequest, NextResponse } from 'next/server'
import { getAllFeeds, addFeed } from '@/lib/rss-parser'
import { validateFeedUrl, ValidationError } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

export async function GET() {
  try {
    const feeds = await getAllFeeds()
    return NextResponse.json(feeds)
  } catch (error) {
    logger.error('Error fetching feeds', error)
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 feed additions per minute
  const rateLimitResult = checkRateLimit(request, { maxRequests: 10, windowSeconds: 60 })
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize URL to prevent SSRF
    const validatedUrl = validateFeedUrl(url)

    const feed = await addFeed(validatedUrl)
    return NextResponse.json(feed, { status: 201 })
  } catch (error) {
    logger.error('Error adding feed', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to add feed'
    const status = errorMessage.includes('already exists') ? 409 : 500

    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
}