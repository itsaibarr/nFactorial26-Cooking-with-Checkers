import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { PostHogProvider } from "@/components/common/PostHogProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { getAppUrl, siteDescription, siteName, siteTitle } from "@/lib/site"
import { cn } from "@/lib/utils"

const geist = Geist({subsets:['latin', 'cyrillic'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  applicationName: siteName,
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
