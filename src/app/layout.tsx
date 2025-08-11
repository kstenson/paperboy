import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Paperboy',
  description: 'A Google Reader-inspired RSS reader',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme')
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                
                if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              })()
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}