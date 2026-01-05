import { StoredFeed } from '../storage'

export interface SyncFeed {
  url: string
  title: string
  description?: string
  addedAt: string
}

export interface SyncProvider {
  // Provider identification
  name: string

  // Check if provider is configured and ready to sync
  isConfigured(): boolean

  // Push local feeds to remote storage
  push(feeds: StoredFeed[]): Promise<void>

  // Pull feeds from remote storage
  pull(): Promise<SyncFeed[]>

  // Full bidirectional sync (push + pull + merge)
  sync(localFeeds: StoredFeed[]): Promise<SyncFeed[]>
}
