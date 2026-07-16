import './globals.css'
import type { Metadata } from 'next'
import { Shrikhand, Zilla_Slab, Caveat } from 'next/font/google'

const shrikhand = Shrikhand({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-shrikhand',
})

const zillaSlab = Zilla_Slab({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-zilla-slab',
})

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
})

export const metadata: Metadata = {
  title: 'CampusFlow - Scatterbrain',
  description: 'Student productivity web app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${shrikhand.variable} ${zillaSlab.variable} ${caveat.variable} font-zilla bg-cork relative-content`}>
        {children}
      </body>
    </html>
  )
}