/**
 * Synced RSS Parser
 *
 * This module wraps the client RSS parser and automatically syncs
 * feed changes to configured sync providers (like GitHub Gist).
 *
 * Components should use these functions instead of calling clientRssParser directly
 * to ensure changes are automatically synced.
 */

import * as clientRss from './clientRssParser'
import { syncManager } from './sync/syncManager'
import { storage } from './storage'

// Re-export read-only functions directly (no sync needed)
export const getAllFeeds = clientRss.getAllFeeds
export const getFeedArticles = clientRss.getFeedArticles
export const getAllArticles = clientRss.getAllArticles
export const markArticleAsRead = clientRss.markArticleAsRead
export const markAllArticlesAsRead = clientRss.markAllArticlesAsRead
export const markAllFeedArticlesAsRead = clientRss.markAllFeedArticlesAsRead
export const exportOPML = clientRss.exportOPML
export const updateAllFeeds = clientRss.updateAllFeeds

// Wrap functions that modify feeds to auto-sync

export async function addFeed(url: string): Promise<void> {
  await clientRss.addFeed(url)

  // Auto-sync after adding feed
  const feeds = storage.getAllFeeds()
  await syncManager.autoSync(feeds)
}

export async function importOPML(opmlContent: string): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const result = await clientRss.importOPML(opmlContent)

  // Auto-sync after importing feeds
  const feeds = storage.getAllFeeds()
  await syncManager.autoSync(feeds)

  return result
}

export function clearAllFeeds(): void {
  clientRss.clearAllFeeds()

  // Auto-sync after clearing feeds (will push empty list)
  const feeds = storage.getAllFeeds()
  syncManager.autoSync(feeds) // Fire and forget
}

// Manual sync function for components
export async function manualSync(): Promise<{
  newFeeds: Array<{ url: string; title: string }>
  errors: Array<{ provider: string; message: string }>
}> {
  const localFeeds = storage.getAllFeeds()
  const result = await syncManager.manualSync(localFeeds)

  return {
    newFeeds: result.newFeeds,
    errors: result.errors.map(e => ({
      provider: e.provider,
      message: e.error.message
    }))
  }
}
