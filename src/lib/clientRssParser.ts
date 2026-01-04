import Parser from 'rss-parser'
import { storage, StoredFeed, StoredArticle } from './storage'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Paperboy App/1.0',
  },
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['podcast:transcript', 'podcastTranscript', {keepArray: true}],
      ['enclosure', 'enclosure'],
    ]
  }
})

export interface ParsedFeed {
  title: string
  description?: string
  link?: string
  items: ParsedArticle[]
}

export interface ParsedArticle {
  title: string
  content: string
  link: string
  pubDate: Date
  guid?: string
  // Podcast fields
  mediaType?: 'article' | 'podcast'
  audioUrl?: string
  transcript?: string
  duration?: number
}

// CORS proxy for RSS feeds that don't allow cross-origin requests
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
]

let currentProxyIndex = 0

// Podcast detection and extraction helpers
function isPodcastItem(item: any): boolean {
  const enclosure = item.enclosure
  if (!enclosure) return false

  const type = enclosure.type || enclosure.$?.type || ''
  return type.startsWith('audio/')
}

function extractAudioUrl(item: any): string | undefined {
  const enclosure = item.enclosure
  if (!enclosure) return undefined

  return enclosure.url || enclosure.$?.url
}

function extractTranscript(item: any): string | undefined {
  // Priority 1: Podcast Namespace 2.0 transcript tag
  if (item.podcastTranscript) {
    const transcripts = Array.isArray(item.podcastTranscript)
      ? item.podcastTranscript
      : [item.podcastTranscript]

    for (const transcript of transcripts) {
      // Prefer embedded text transcripts
      if (transcript._ && transcript.$.type === 'text/plain') {
        return transcript._
      }
      // HTML transcripts
      if (transcript._ && transcript.$.type === 'text/html') {
        return transcript._
      }
      // If transcript is in content
      if (typeof transcript === 'string') {
        return transcript
      }
    }
  }

  // Priority 2: Check if content is unusually long (likely a transcript)
  const content = item.content || item.summary || item.contentSnippet || ''
  const textContent = content.replace(/<[^>]*>/g, '').trim()
  if (textContent.length > 3000) {
    // Very long content in a podcast feed is likely a transcript
    return content
  }

  return undefined
}

function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined

  // iTunes duration can be in HH:MM:SS, MM:SS, or seconds
  if (duration.includes(':')) {
    const parts = duration.split(':').map(p => parseInt(p, 10))
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1]
    }
  }

  // Just seconds
  const seconds = parseInt(duration, 10)
  return isNaN(seconds) ? undefined : seconds
}

async function fetchWithCORS(url: string): Promise<string> {
  // First try direct fetch
  try {
    const response = await fetch(url)
    if (response.ok) {
      return await response.text()
    }
  } catch (error) {
    console.log('Direct fetch failed, trying CORS proxy:', error)
  }

  // Try CORS proxies
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length
    const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(url)
    
    try {
      console.log(`Trying CORS proxy ${proxyIndex + 1}:`, proxyUrl)
      const response = await fetch(proxyUrl)
      if (response.ok) {
        currentProxyIndex = proxyIndex // Remember successful proxy
        return await response.text()
      }
    } catch (error) {
      console.log(`CORS proxy ${proxyIndex + 1} failed:`, error)
    }
  }

  throw new Error('All fetch methods failed. The RSS feed may not be accessible.')
}

export async function parseFeedUrl(url: string): Promise<ParsedFeed> {
  try {
    const feedContent = await fetchWithCORS(url)
    const feed = await parser.parseString(feedContent)

    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description,
      link: feed.link,
      items: feed.items.map(item => {
        const isPodcast = isPodcastItem(item)
        const audioUrl = extractAudioUrl(item)
        const transcript = extractTranscript(item)
        const duration = parseDuration((item as any).itunesDuration)

        return {
          title: item.title || 'Untitled',
          content: item.content || item.summary || item.contentSnippet || '',
          link: item.link || '',
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          guid: item.guid,
          // Podcast fields
          mediaType: isPodcast ? 'podcast' : 'article',
          audioUrl: audioUrl,
          transcript: transcript,
          duration: duration,
        }
      }),
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function addFeed(url: string): Promise<StoredFeed> {
  try {
    const parsedFeed = await parseFeedUrl(url)
    
    const feed = storage.addFeed({
      title: parsedFeed.title,
      url: url,
      description: parsedFeed.description,
    })
    
    if (parsedFeed.items.length > 0) {
      await addArticlesFromFeed(feed.id, parsedFeed.items)
    }
    
    return feed
  } catch (error) {
    console.error('Error adding feed:', error)
    throw error
  }
}

export async function updateFeed(feedId: string): Promise<StoredFeed> {
  try {
    const feeds = storage.getAllFeeds()
    const feed = feeds.find(f => f.id === feedId)
    
    if (!feed) {
      throw new Error('Feed not found')
    }
    
    const parsedFeed = await parseFeedUrl(feed.url)
    
    const updatedFeed = storage.updateFeed(feedId, {
      title: parsedFeed.title,
      description: parsedFeed.description,
    })
    
    if (parsedFeed.items.length > 0) {
      await addArticlesFromFeed(feedId, parsedFeed.items)
    }
    
    return updatedFeed!
  } catch (error) {
    console.error('Error updating feed:', error)
    throw error
  }
}

export async function updateAllFeeds(): Promise<void> {
  const feeds = storage.getAllFeeds()
  const updatePromises = feeds.map(feed => 
    updateFeed(feed.id).catch(error => {
      console.error(`Failed to update feed ${feed.title}:`, error)
      return null
    })
  )
  
  await Promise.all(updatePromises)
}

async function addArticlesFromFeed(feedId: string, articles: ParsedArticle[]): Promise<void> {
  for (const article of articles) {
    if (!article.link) continue

    try {
      storage.addArticle({
        feedId,
        title: article.title,
        content: article.content,
        url: article.link,
        pubDate: article.pubDate,
        isRead: false,
        // Podcast fields
        mediaType: article.mediaType,
        audioUrl: article.audioUrl,
        transcript: article.transcript,
        duration: article.duration,
      })
    } catch (error) {
      // Article might already exist, which is fine
      console.log('Article already exists or failed to add:', article.title)
    }
  }
}

// Feed management functions
export function getAllFeeds(): (StoredFeed & { _count: { articles: number } })[] {
  return storage.getAllFeedsWithCounts()
}

export function getFeedArticles(feedId: string, limit = 50): StoredArticle[] {
  return storage.getFeedArticles(feedId, limit)
}

export function getAllArticles(limit = 100): StoredArticle[] {
  return storage.getAllArticles(limit)
}

export function markArticleAsRead(articleId: string, isRead = true): StoredArticle | null {
  return storage.markArticleAsRead(articleId, isRead)
}

export function getUnreadArticles(limit = 100): StoredArticle[] {
  return storage.getUnreadArticles(limit)
}

export function markAllFeedArticlesAsRead(feedId: string): void {
  storage.markAllFeedArticlesAsRead(feedId)
}

export function markAllArticlesAsRead(): void {
  storage.markAllArticlesAsRead()
}

export function deleteFeed(feedId: string): boolean {
  return storage.deleteFeed(feedId)
}

export function clearAllFeeds(): void {
  storage.clearAllFeeds()
}

// OPML functions
export function exportOPML(): string {
  const feeds = storage.getAllFeeds()
  
  const opmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Paperboy RSS Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <docs>http://www.opml.org/spec2</docs>
  </head>
  <body>`

  const feedOutlines = feeds.map(feed => 
    `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" ${feed.description ? `description="${escapeXml(feed.description)}"` : ''}/>`
  ).join('\n')

  const opmlFooter = `
  </body>
</opml>`

  return opmlHeader + '\n' + feedOutlines + opmlFooter
}

export async function importOPML(opmlContent: string): Promise<{ success: number; failed: number; errors: string[] }> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(opmlContent, 'text/xml')
  
  const outlines = doc.querySelectorAll('outline[xmlUrl]')
  const results = { success: 0, failed: 0, errors: [] as string[] }
  
  for (let i = 0; i < outlines.length; i++) {
    const outline = outlines[i]
    const url = outline.getAttribute('xmlUrl')
    const title = outline.getAttribute('text') || outline.getAttribute('title') || 'Untitled'
    
    if (!url) continue
    
    try {
      await addFeed(url)
      results.success++
    } catch (error) {
      results.failed++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`Failed to add "${title}": ${errorMessage}`)
    }
  }
  
  return results
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}