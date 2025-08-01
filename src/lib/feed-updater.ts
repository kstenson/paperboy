import { prisma } from './db'
import { updateFeed } from './rss-parser'

let updateInterval: NodeJS.Timeout | null = null

export function startFeedUpdater(intervalMinutes = 30) {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  
  updateInterval = setInterval(async () => {
    try {
      console.log('Starting scheduled feed update...')
      const feeds = await prisma.feed.findMany()
      
      for (const feed of feeds) {
        try {
          await updateFeed(feed.id)
          console.log(`Updated feed: ${feed.title}`)
        } catch (error) {
          console.error(`Failed to update feed ${feed.title}:`, error)
        }
      }
      
      console.log(`Completed scheduled update of ${feeds.length} feeds`)
    } catch (error) {
      console.error('Error in scheduled feed update:', error)
    }
  }, intervalMinutes * 60 * 1000)
  
  console.log(`Feed updater started with ${intervalMinutes} minute interval`)
}

export function stopFeedUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
    console.log('Feed updater stopped')
  }
}

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startFeedUpdater(30)
}