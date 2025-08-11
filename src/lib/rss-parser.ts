import Parser from 'rss-parser'
import { prisma } from './db'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Paperboy App/1.0',
  },
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
}

export async function parseFeedUrl(url: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(url)
    
    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description,
      link: feed.link,
      items: feed.items.map(item => ({
        title: item.title || 'Untitled',
        content: item.content || item.summary || item.contentSnippet || '',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid: item.guid,
      })),
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function addFeed(url: string) {
  try {
    const parsedFeed = await parseFeedUrl(url)
    
    const existingFeed = await prisma.feed.findUnique({
      where: { url }
    })
    
    if (existingFeed) {
      throw new Error('Feed already exists')
    }
    
    const feed = await prisma.feed.create({
      data: {
        title: parsedFeed.title,
        url: url,
        description: parsedFeed.description,
      }
    })
    
    if (parsedFeed.items.length > 0) {
      await addArticlesFromFeed(feed.id, parsedFeed.items, url)
    }
    
    return feed
  } catch (error) {
    console.error('Error adding feed:', error)
    throw error
  }
}

export async function updateFeed(feedId: string) {
  try {
    const feed = await prisma.feed.findUnique({
      where: { id: feedId }
    })
    
    if (!feed) {
      throw new Error('Feed not found')
    }
    
    const parsedFeed = await parseFeedUrl(feed.url)
    
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        title: parsedFeed.title,
        description: parsedFeed.description,
        updatedAt: new Date(),
      }
    })
    
    if (parsedFeed.items.length > 0) {
      await addArticlesFromFeed(feedId, parsedFeed.items, feed.url)
    }
    
    return feed
  } catch (error) {
    console.error('Error updating feed:', error)
    throw error
  }
}

async function addArticlesFromFeed(feedId: string, articles: ParsedArticle[], feedUrl: string) {
  for (const article of articles) {
    if (!article.link) continue
    
    const existingArticle = await prisma.article.findUnique({
      where: { url: article.link }
    })
    
    if (!existingArticle) {
      await prisma.article.create({
        data: {
          feedId,
          title: article.title,
          content: article.content,
          url: article.link,
          pubDate: article.pubDate,
        }
      })
    }
  }
}

export async function getAllFeeds() {
  return await prisma.feed.findMany({
    include: {
      articles: {
        orderBy: { pubDate: 'desc' },
        take: 5,
      },
      _count: {
        select: {
          articles: {
            where: { isRead: false }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getFeedArticles(feedId: string, limit = 50) {
  return await prisma.article.findMany({
    where: { feedId },
    orderBy: { pubDate: 'desc' },
    take: limit,
    include: {
      feed: {
        select: {
          title: true,
          url: true,
        }
      }
    }
  })
}

export async function markArticleAsRead(articleId: string, isRead = true) {
  return await prisma.article.update({
    where: { id: articleId },
    data: { isRead }
  })
}

export async function getUnreadArticles(limit = 100) {
  return await prisma.article.findMany({
    where: { isRead: false },
    orderBy: { pubDate: 'desc' },
    take: limit,
    include: {
      feed: {
        select: {
          title: true,
          url: true,
        }
      }
    }
  })
}

export async function markAllFeedArticlesAsRead(feedId: string) {
  return await prisma.article.updateMany({
    where: { 
      feedId,
      isRead: false 
    },
    data: { isRead: true }
  })
}

export async function markAllArticlesAsRead() {
  return await prisma.article.updateMany({
    where: { isRead: false },
    data: { isRead: true }
  })
}