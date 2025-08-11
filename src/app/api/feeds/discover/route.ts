import { NextRequest, NextResponse } from 'next/server'
import { JSDOM } from 'jsdom'
import { prisma } from '@/lib/db'

// Add CORS headers for bookmarklet requests
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return addCorsHeaders(NextResponse.json({ error: 'URL is required' }, { status: 400 }))
    }

    console.log('Discovering feeds for:', url)

    // First, try the URL directly as an RSS feed
    try {
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        }
      })

      if (directResponse.ok) {
        const content = await directResponse.text()
        if (content.includes('<rss') || content.includes('<feed') || content.includes('<channel')) {
          // This URL is already an RSS feed
          console.log('Direct RSS feed found')
          return await addFeedToDatabase(url, content)
        }
      }
    } catch (error) {
      console.log('Direct RSS check failed:', error)
    }

    // If not a direct RSS feed, fetch the HTML page and look for feed links
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      return addCorsHeaders(NextResponse.json({ 
        error: `Failed to fetch page: ${response.status}` 
      }, { status: response.status }))
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Look for RSS/Atom feed links in the HTML head
    const feedLinks = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"], link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]')
    
    const discoveredFeeds = []
    
    for (let i = 0; i < feedLinks.length; i++) {
      const link = feedLinks[i]
      const href = link.getAttribute('href')
      const title = link.getAttribute('title') || 'RSS Feed'
      
      if (href) {
        // Convert relative URLs to absolute
        const feedUrl = new URL(href, url).toString()
        discoveredFeeds.push({ url: feedUrl, title })
      }
    }

    console.log('Discovered feeds:', discoveredFeeds)

    if (discoveredFeeds.length === 0) {
      // Try common RSS feed paths
      const commonPaths = ['/rss', '/rss.xml', '/feed', '/feed.xml', '/atom.xml', '/feeds/all.atom.xml']
      const baseUrl = new URL(url)
      
      for (const path of commonPaths) {
        try {
          const feedUrl = `${baseUrl.origin}${path}`
          const feedResponse = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
              'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
            }
          })
          
          if (feedResponse.ok) {
            const feedContent = await feedResponse.text()
            if (feedContent.includes('<rss') || feedContent.includes('<feed') || feedContent.includes('<channel')) {
              discoveredFeeds.push({ url: feedUrl, title: 'RSS Feed' })
              break // Use the first working common path
            }
          }
        } catch (error) {
          console.log(`Failed to check ${path}:`, error)
        }
      }
    }

    if (discoveredFeeds.length === 0) {
      return addCorsHeaders(NextResponse.json({ 
        error: 'No RSS or Atom feeds found on this page' 
      }, { status: 404 }))
    }

    // Add the first discovered feed to the database
    const feedToAdd = discoveredFeeds[0]
    return await addFeedToDatabase(feedToAdd.url, null, feedToAdd.title)

  } catch (error) {
    console.error('Error discovering feeds:', error)
    return addCorsHeaders(NextResponse.json(
      { error: 'Failed to discover feeds' },
      { status: 500 }
    ))
  }
}

async function addFeedToDatabase(feedUrl: string, feedContent?: string | null, title?: string) {
  try {
    // Check if feed already exists
    const existingFeed = await prisma.feed.findUnique({
      where: { url: feedUrl }
    })

    if (existingFeed) {
      return addCorsHeaders(NextResponse.json({ 
        success: true,
        message: 'Feed already exists',
        feed: existingFeed,
        alreadyExists: true
      }))
    }

    // If we don't have the feed content, fetch it
    if (!feedContent) {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`)
      }

      feedContent = await response.text()
    }

    // Parse the feed to get the title if not provided
    if (!title) {
      const dom = new JSDOM(feedContent, { contentType: 'text/xml' })
      const doc = dom.window.document
      
      const titleElement = doc.querySelector('channel > title') || 
                          doc.querySelector('feed > title') ||
                          doc.querySelector('title')
      
      title = titleElement?.textContent?.trim() || 'Unknown Feed'
    }

    // Create the feed
    const feed = await prisma.feed.create({
      data: {
        url: feedUrl,
        title: title
      }
    })

    return addCorsHeaders(NextResponse.json({ 
      success: true,
      message: 'Feed added successfully',
      feed,
      alreadyExists: false
    }))

  } catch (error) {
    console.error('Error adding feed to database:', error)
    throw error
  }
}