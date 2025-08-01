import { parseString } from 'xml2js'
import { prisma } from './db'
import { addFeed } from './rss-parser'

export interface OPMLFeed {
  title: string
  xmlUrl: string
  htmlUrl?: string
  description?: string
}

export interface OPMLParseResult {
  title?: string
  feeds: OPMLFeed[]
}

export async function parseOPML(opmlContent: string): Promise<OPMLParseResult> {
  return new Promise((resolve, reject) => {
    parseString(opmlContent, (err, result) => {
      if (err) {
        reject(new Error(`Failed to parse OPML: ${err.message}`))
        return
      }

      try {
        const opml = result.opml
        if (!opml || !opml.body || !opml.body[0] || !opml.body[0].outline) {
          reject(new Error('Invalid OPML format: missing body or outline elements'))
          return
        }

        const title = opml.head?.[0]?.title?.[0] || 'Imported Subscriptions'
        const feeds: OPMLFeed[] = []

        const extractFeeds = (outlines: any[]) => {
          for (const outline of outlines) {
            const attrs = outline.$
            if (attrs && attrs.xmlUrl) {
              feeds.push({
                title: attrs.title || attrs.text || 'Untitled Feed',
                xmlUrl: attrs.xmlUrl,
                htmlUrl: attrs.htmlUrl,
                description: attrs.description
              })
            }
            
            if (outline.outline && Array.isArray(outline.outline)) {
              extractFeeds(outline.outline)
            }
          }
        }

        extractFeeds(opml.body[0].outline)
        
        resolve({
          title,
          feeds
        })
      } catch (error) {
        reject(new Error(`Error processing OPML: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  })
}

export async function importOPMLFeeds(opmlContent: string): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const result = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  }

  try {
    const { feeds } = await parseOPML(opmlContent)
    
    for (const feed of feeds) {
      try {
        const existingFeed = await prisma.feed.findUnique({
          where: { url: feed.xmlUrl }
        })
        
        if (existingFeed) {
          result.errors.push(`Feed already exists: ${feed.title}`)
          result.failed++
          continue
        }
        
        await addFeed(feed.xmlUrl)
        result.success++
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Failed to add ${feed.title}: ${errorMessage}`)
        result.failed++
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`OPML parsing failed: ${errorMessage}`)
    result.failed++
  }

  return result
}

export function generateOPML(feeds: { title: string; url: string; description?: string }[]): string {
  const now = new Date().toUTCString()
  
  let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSS Reader Subscriptions</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
`

  for (const feed of feeds) {
    const title = feed.title.replace(/"/g, '&quot;')
    const description = feed.description?.replace(/"/g, '&quot;') || ''
    
    opml += `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${feed.url}" description="${description}" />\n`
  }

  opml += `  </body>
</opml>`

  return opml
}