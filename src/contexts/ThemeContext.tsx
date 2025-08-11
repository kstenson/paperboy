'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  autoFetchContent: boolean
  toggleAutoFetchContent: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [autoFetchContent, setAutoFetchContent] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    } else if (savedTheme === 'light') {
      setIsDarkMode(false)
    } else {
      // Default to system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    // Load auto-fetch preference from localStorage
    const savedAutoFetch = localStorage.getItem('autoFetchContent')
    if (savedAutoFetch === 'true') {
      setAutoFetchContent(true)
    }

    setIsLoaded(true)
  }, [])

  useEffect(() => {
    // Apply theme to document only after initial load
    if (!isLoaded) return
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode, isLoaded])

  useEffect(() => {
    // Save auto-fetch preference to localStorage
    if (!isLoaded) return
    localStorage.setItem('autoFetchContent', autoFetchContent.toString())
  }, [autoFetchContent, isLoaded])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  const toggleAutoFetchContent = () => {
    setAutoFetchContent(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, autoFetchContent, toggleAutoFetchContent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}