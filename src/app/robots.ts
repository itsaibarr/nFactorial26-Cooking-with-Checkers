import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/auth", "/dashboard", "/ingest"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  }
}
