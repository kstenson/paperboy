import RSSReader from '@/components/RSSReader'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function Home() {
  return (
    <ThemeProvider>
      <RSSReader />
    </ThemeProvider>
  )
}