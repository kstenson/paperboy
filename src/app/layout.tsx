import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Paperboy',
  description: 'A Google Reader-inspired RSS reader',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any', type: 'image/png' },
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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