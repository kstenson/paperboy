import { NextRequest, NextResponse } from 'next/server'
import { JSDOM } from 'jsdom'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Paperboy Bot)'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch article: ${response.status}` 
      }, { status: response.status })
    }

    const html = await response.text()
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Try to extract main content using common selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content', 
      '.article-content',
      '.content',
      'main',
      '.post-body',
      '.article-body'
    ]

    let content = ''
    let title = ''

    // Get title
    const titleElement = document.querySelector('h1') || 
                        document.querySelector('title') ||
                        document.querySelector('.post-title') ||
                        document.querySelector('.article-title')
    
    if (titleElement) {
      title = titleElement.textContent?.trim() || ''
    }

    // Try each content selector until we find content
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = element.innerHTML
        break
      }
    }

    // If no content found with selectors, try to extract from body
    if (!content) {
      const bodyElement = document.querySelector('body')
      if (bodyElement) {
        // Remove script, style, nav, header, footer elements
        const elementsToRemove = bodyElement.querySelectorAll('script, style, nav, header, footer, .nav, .header, .footer, .sidebar, .menu')
        elementsToRemove.forEach(el => el.remove())
        
        content = bodyElement.innerHTML
      }
    }

    // Clean up the content
    if (content) {
      // Remove unwanted elements
      const tempDom = new JSDOM(content)
      const tempDoc = tempDom.window.document
      
      // Remove ads, social sharing, navigation elements
      const unwantedSelectors = [
        '.ad', '.ads', '.advertisement',
        '.social-share', '.share-buttons',
        '.related-posts', '.recommended',
        '.comments', '.comment-section',
        '.navigation', '.nav-links',
        '.sidebar', '.widget'
      ]
      
      unwantedSelectors.forEach(selector => {
        const elements = tempDoc.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      })
      
      content = tempDoc.body.innerHTML
    }

    return NextResponse.json({
      success: true,
      title: title || 'Fetched Article',
      content: content || 'Unable to extract content from this article.',
      originalUrl: url
    })

  } catch (error) {
    console.error('Error fetching article content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article content' },
      { status: 500 }
    )
  }
}