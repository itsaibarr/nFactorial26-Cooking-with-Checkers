import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl()

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
