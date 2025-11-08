import type { Metadata } from 'next'
import './globals.css'
import ConnectionError from '@/components/ConnectionError'

export const metadata: Metadata = {
  title: 'WhatApp - WhatsApp Clone',
  description: 'A WhatsApp-like messaging application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <ConnectionError />
        {children}
      </body>
    </html>
  )
}

