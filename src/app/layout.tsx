import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RSS Reader',
  description: 'A Google Reader-inspired RSS reader',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}