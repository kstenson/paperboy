import { prisma } from './db'
import { updateFeed } from './rss-parser'
import { logger } from './logger'

let updateInterval: NodeJS.Timeout | null = null

export function startFeedUpdater(intervalMinutes = 30) {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  
  updateInterval = setInterval(async () => {
    try {
      logger.info('Starting scheduled feed update...')
      const feeds = await prisma.feed.findMany()
      
      for (const feed of feeds) {
        try {
          await updateFeed(feed.id)
          logger.info(`Updated feed: ${feed.title}`)
        } catch (error) {
          logger.error(`Failed to update feed ${feed.title}`, error)
        }
      }
      
      logger.info(`Completed scheduled update of ${feeds.length} feeds`)
    } catch (error) {
      logger.error('Error in scheduled feed update', error)
    }
  }, intervalMinutes * 60 * 1000)
  
  logger.info(`Feed updater started with ${intervalMinutes} minute interval`)
}

export function stopFeedUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
    logger.info('Feed updater stopped')
  }
}

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startFeedUpdater(30)
}