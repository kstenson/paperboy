import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateOPML } from '@/lib/opml-parser'

export async function GET() {
  try {
    const feeds = await prisma.feed.findMany({
      select: {
        title: true,
        url: true,
        description: true
      },
      orderBy: {
        title: 'asc'
      }
    })
    
    if (feeds.length === 0) {
      return NextResponse.json(
        { error: 'No feeds to export' },
        { status: 404 }
      )
    }
    
    const feedsForExport = feeds.map(feed => ({
      title: feed.title,
      url: feed.url,
      description: feed.description || undefined
    }))
    
    const opmlContent = generateOPML(feedsForExport)
    
    return new NextResponse(opmlContent, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="rss-subscriptions.opml"'
      }
    })
    
  } catch (error) {
    console.error('Error exporting OPML:', error)
    
    return NextResponse.json(
      { error: 'Failed to export OPML file' },
      { status: 500 }
    )
  }
}