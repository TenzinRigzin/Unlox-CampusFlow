import './globals.css'
import type { Metadata } from 'next'
import ThemeToggle from './components/ThemeToggle'

export const metadata: Metadata = {
  title: 'CampusFlow',
  description: 'Student productivity web app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  )
}