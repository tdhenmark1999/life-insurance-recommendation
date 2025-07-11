import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Life Insurance Advisor - Get Personalized Recommendations',
  description: 'Get personalized life insurance recommendations based on your unique profile. Fast, secure, and tailored to your needs.',
  keywords: 'life insurance, insurance recommendation, term life, whole life, insurance calculator',
  authors: [{ name: 'Life Insurance Advisor Team' }],
  openGraph: {
    title: 'Life Insurance Advisor',
    description: 'Get personalized life insurance recommendations in seconds',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}