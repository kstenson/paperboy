import { StoredFeed } from '../storage'
import { SyncProvider, SyncFeed } from './syncProvider'

class SyncManager {
  private providers: SyncProvider[] = []
  private isSyncing = false

  // Register a sync provider
  registerProvider(provider: SyncProvider): void {
    this.providers.push(provider)
    console.log(`Registered sync provider: ${provider.name}`)
  }

  // Get all registered providers
  getProviders(): SyncProvider[] {
    return this.providers
  }

  // Get configured providers only
  getConfiguredProviders(): SyncProvider[] {
    return this.providers.filter(p => p.isConfigured())
  }

  // Check if any provider is configured
  hasConfiguredProviders(): boolean {
    return this.getConfiguredProviders().length > 0
  }

  // Auto-sync: Push local feeds to all configured providers
  async autoSync(localFeeds: StoredFeed[]): Promise<void> {
    const configuredProviders = this.getConfiguredProviders()

    if (configuredProviders.length === 0) {
      return // No providers configured, nothing to sync
    }

    if (this.isSyncing) {
      console.log('Sync already in progress, skipping auto-sync')
      return
    }

    this.isSyncing = true

    try {
      // Push to all configured providers in parallel
      await Promise.all(
        configuredProviders.map(async (provider) => {
          try {
            await provider.push(localFeeds)
            console.log(`Auto-synced to ${provider.name}`)
          } catch (error) {
            console.error(`Auto-sync to ${provider.name} failed:`, error)
            // Continue with other providers even if one fails
          }
        })
      )
    } finally {
      this.isSyncing = false
    }
  }

  // Manual sync: Full bidirectional sync with all providers
  async manualSync(localFeeds: StoredFeed[]): Promise<{
    newFeeds: SyncFeed[]
    errors: Array<{ provider: string; error: Error }>
  }> {
    const configuredProviders = this.getConfiguredProviders()

    if (configuredProviders.length === 0) {
      throw new Error('No sync providers configured')
    }

    const allNewFeeds: SyncFeed[] = []
    const errors: Array<{ provider: string; error: Error }> = []

    // Sync with all providers in parallel
    await Promise.all(
      configuredProviders.map(async (provider) => {
        try {
          const remoteFeeds = await provider.sync(localFeeds)

          // Find feeds that don't exist locally
          const newFeeds = remoteFeeds.filter(
            remoteFeed => !localFeeds.some(localFeed => localFeed.url === remoteFeed.url)
          )

          allNewFeeds.push(...newFeeds)
        } catch (error) {
          console.error(`Manual sync with ${provider.name} failed:`, error)
          errors.push({
            provider: provider.name,
            error: error instanceof Error ? error : new Error(String(error))
          })
        }
      })
    )

    // Deduplicate new feeds by URL
    const uniqueNewFeeds = allNewFeeds.filter(
      (feed, index, self) => index === self.findIndex(f => f.url === feed.url)
    )

    return {
      newFeeds: uniqueNewFeeds,
      errors
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager()
