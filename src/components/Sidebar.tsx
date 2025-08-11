'use client'

import { Plus, RefreshCw, CheckCheck, Upload, Download, Settings, ChevronUp, ChevronDown, Trash2, Moon, Sun, Bookmark, Copy } from 'lucide-react'
import PaperboyLogo from './PaperboyLogo'
import { useState } from 'react'

interface Feed {
  id: string
  title: string
  url: string
  _count: {
    articles: number
  }
}

interface SidebarProps {
  feeds: Feed[]
  selectedFeedId?: string | null
  onFeedSelect: (feedId: string | null) => void
  onAddFeed: (url: string) => void
  onRefreshFeeds: () => void
  onMarkAllAsRead: (feedId?: string) => void
  onImportOPML: (file: File) => void
  onExportOPML: () => void
  onClearAll: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  autoFetchContent: boolean
  onToggleAutoFetchContent: () => void
  isRefreshing?: boolean
  isImporting?: boolean
}

export default function Sidebar({ feeds, selectedFeedId, onFeedSelect, onAddFeed, onRefreshFeeds, onMarkAllAsRead, onImportOPML, onExportOPML, onClearAll, isDarkMode, onToggleDarkMode, autoFetchContent, onToggleAutoFetchContent, isRefreshing, isImporting }: SidebarProps) {
  const [isAddingFeed, setIsAddingFeed] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(true)
  const [isFeedManagementExpanded, setIsFeedManagementExpanded] = useState(true)

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (feedUrl.trim()) {
      try {
        await onAddFeed(feedUrl.trim())
        setFeedUrl('')
        setIsAddingFeed(false)
      } catch (error) {
        console.error('Error adding feed:', error)
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImportOPML(file)
      event.target.value = ''
    }
  }

  const generateBookmarklet = () => {
    const readerUrl = window.location.origin
    // Create bookmarklet as a single line with proper escaping
    const bookmarkletCode = `javascript:(function(){var url=window.location.href;var title=document.title;var overlay=document.createElement('div');overlay.id='rss-reader-overlay';overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;';var popup=document.createElement('div');popup.style.cssText='background:white;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:400px;text-align:center;';popup.innerHTML='<div style="margin-bottom:15px;"><div style="display:inline-block;width:20px;height:20px;border:2px solid %23ddd;border-top:2px solid %23007bff;border-radius:50%;animation:spin 1s linear infinite;"></div></div><div>Adding feed to Paperboy...</div><style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>';overlay.appendChild(popup);document.body.appendChild(overlay);fetch('${readerUrl}/api/feeds/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})}).then(function(response){return response.json();}).then(function(data){if(data.success){popup.innerHTML='<div style="color:%2328a745;margin-bottom:15px;font-size:18px;">✓</div><div style="margin-bottom:10px;">Feed '+(data.alreadyExists?'already exists':'added successfully')+'!</div><div style="font-size:14px;color:%23666;">'+(data.feed.title||title)+'</div><div style="margin-top:15px;"><button onclick="document.getElementById(\\'rss-reader-overlay\\').remove()" style="background:%23007bff;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Close</button></div>';}else{popup.innerHTML='<div style="color:%23dc3545;margin-bottom:15px;font-size:18px;">✗</div><div style="margin-bottom:10px;">Failed to add feed</div><div style="font-size:14px;color:%23666;">'+(data.error||'Unknown error')+'</div><div style="margin-top:15px;"><button onclick="document.getElementById(\\'rss-reader-overlay\\').remove()" style="background:%23dc3545;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Close</button></div>';}}).catch(function(error){popup.innerHTML='<div style="color:%23dc3545;margin-bottom:15px;font-size:18px;">✗</div><div style="margin-bottom:10px;">Network error</div><div style="font-size:14px;color:%23666;">Could not connect to Paperboy</div><div style="margin-top:15px;"><button onclick="document.getElementById(\\'rss-reader-overlay\\').remove()" style="background:%23dc3545;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Close</button></div>';});})();`
    
    return bookmarkletCode
  }

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(generateBookmarklet())
      // You could add a toast notification here if available
      alert('Bookmarklet copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy bookmarklet:', error)
      alert('Failed to copy bookmarklet. Please copy it manually.')
    }
  }

  const totalUnread = feeds.reduce((sum, feed) => sum + feed._count.articles, 0)

  return (
    <div className="sidebar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-google-reader-border dark:border-google-reader-border-dark">
        <h1 className="text-xl font-bold text-google-reader-primary flex items-center gap-2">
          <PaperboyLogo className="w-10 h-10" />
          Paperboy
        </h1>
      </div>
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* All Items Section */}
          <div className="mb-6">
            <div className={`flex items-center rounded ${!selectedFeedId ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
              <button
                onClick={() => onFeedSelect(null)}
                className={`flex-1 text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  !selectedFeedId ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <span className="font-medium">All items</span>
                {totalUnread > 0 && (
                  <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                    {totalUnread}
                  </span>
                )}
              </button>
              {totalUnread > 0 && (
                <button
                  onClick={() => onMarkAllAsRead()}
                  className="p-3 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Subscriptions Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscriptions</h3>
              <button
                onClick={onRefreshFeeds}
                disabled={isRefreshing}
                className="text-gray-600 dark:text-gray-400 hover:text-google-reader-primary disabled:opacity-50 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Refresh all feeds"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="space-y-1">
              {feeds.map((feed) => (
                <div 
                  key={feed.id}
                  className={`flex items-center rounded ${selectedFeedId === feed.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                >
                  <button
                    onClick={() => onFeedSelect(feed.id)}
                    className={`flex-1 text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm ${
                      selectedFeedId === feed.id ? 'text-blue-600 dark:text-blue-400' : ''
                    }`}
                  >
                    <span className="truncate">{feed.title}</span>
                    {feed._count.articles > 0 && (
                      <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs ml-2 flex-shrink-0">
                        {feed._count.articles}
                      </span>
                    )}
                  </button>
                  {feed._count.articles > 0 && (
                    <button
                      onClick={() => onMarkAllAsRead(feed.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title={`Mark all articles in ${feed.title} as read`}
                    >
                      <CheckCheck className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {feeds.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-4">
                  No feeds added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section - Fixed at bottom */}
      <div className="border-t border-google-reader-border dark:border-google-reader-border-dark bg-gray-50 dark:bg-gray-800">
        <div className="p-4">
          <button
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </h3>
            {isSettingsExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
          
          {/* Collapsible Settings Content */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSettingsExpanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* General Section */}
            <div className="mb-4">
              <button
                onClick={() => setIsGeneralExpanded(!isGeneralExpanded)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">General</h4>
                {isGeneralExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronUp className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                )}
              </button>
              
              <div 
                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                  isGeneralExpanded ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
                }`}
              >
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Dark Mode</span>
                  <button
                    onClick={onToggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto Fetch Content Toggle */}
                <div className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Auto Fetch Full Content</span>
                  <button
                    onClick={onToggleAutoFetchContent}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      autoFetchContent ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoFetchContent ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Feed Management Section */}
            <div className="mb-4">
              <button
                onClick={() => setIsFeedManagementExpanded(!isFeedManagementExpanded)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Feed Management</h4>
                {isFeedManagementExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronUp className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                )}
              </button>
              
              <div 
                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                  isFeedManagementExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
                }`}
              >
                {/* Add Feed Form */}
                {isAddingFeed && (
                  <form onSubmit={handleAddFeed} className="mb-3">
                    <input
                      type="url"
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      placeholder="Enter RSS feed URL..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-google-reader-primary text-white px-3 py-1 rounded text-sm hover:bg-red-600 dark:hover:bg-red-700 flex-1"
                      >
                        Add Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingFeed(false)
                          setFeedUrl('')
                        }}
                        className="text-gray-500 dark:text-gray-400 px-3 py-1 rounded text-sm hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                
                {/* Management Actions */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    onClick={() => setIsAddingFeed(true)}
                    className="flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:text-google-reader-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors"
                    title="Add new feed"
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-xs">Add Feed</span>
                  </button>
                  
                  <label className="flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors cursor-pointer">
                    <Upload className={`w-5 h-5 mb-1 ${isImporting ? 'animate-pulse' : ''}`} />
                    <span className="text-xs">Import</span>
                    <input
                      type="file"
                      accept=".opml,.xml"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isImporting}
                    />
                  </label>
                  
                  <button
                    onClick={onExportOPML}
                    className="flex flex-col items-center justify-center p-3 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50"
                    title="Export feeds as OPML"
                    disabled={feeds.length === 0}
                  >
                    <Download className="w-5 h-5 mb-1" />
                    <span className="text-xs">Export</span>
                  </button>
                </div>
                
                {/* Bookmarklet Section */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 mb-3">
                  <div className="mb-2">
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Quick Add Bookmarklet</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                      Drag to your bookmarks bar or click to test on this page:
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={generateBookmarklet()}
                      className="flex-1 flex items-center justify-center gap-2 p-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 transition-colors text-sm cursor-grab"
                      title="Drag to bookmarks bar or click to test"
                    >
                      <Bookmark className="w-4 h-4" />
                      Add to Paperboy
                    </a>
                    
                    <button
                      onClick={copyBookmarklet}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors"
                      title="Copy bookmarklet to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Clear All Button */}
                {feeds.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={onClearAll}
                      className="w-full flex items-center justify-center gap-2 p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition-colors text-sm"
                      title="Clear all subscriptions"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All Subscriptions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Status text - Always visible */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {feeds.length} feed{feeds.length !== 1 ? 's' : ''} • {totalUnread} unread
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}