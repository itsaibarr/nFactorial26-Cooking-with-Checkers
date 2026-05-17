/** @type {import('next').NextConfig} */
const posthogHost =
  (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(
    /\/$/,
    "",
  )
const posthogAssetsHost = posthogHost.includes("eu.i.posthog.com")
  ? "https://eu-assets.i.posthog.com"
  : posthogHost.includes("us.i.posthog.com")
    ? "https://us-assets.i.posthog.com"
    : posthogHost

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `${posthogAssetsHost}/array/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ]
  },
  skipTrailingSlashRedirect: true,
}

export default nextConfig
