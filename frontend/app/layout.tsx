import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vietnam Hotel Finder',
  description: 'AI-powered hotel recommendations for Vietnam',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
