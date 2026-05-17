const productionAppUrl = "https://sharpki.online"
const developmentAppUrl = "http://localhost:3000"

export const siteName = "Sharpki"
export const siteTitle = "Sharpki — русские шашки с ИИ‑тренером"
export const siteDescription =
  "Платформа по русским шашкам с тёплым ИИ‑разбором партии для взрослых 45+."

function trimTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function normalizeUrl(url: string) {
  return trimTrailingSlash(url.trim())
}

function getVercelDeploymentUrl() {
  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (!vercelUrl) {
    return null
  }

  return normalizeUrl(
    vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`,
  )
}

export function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configuredUrl) {
    return normalizeUrl(configuredUrl)
  }

  const vercelDeploymentUrl = getVercelDeploymentUrl()
  if (vercelDeploymentUrl) {
    return vercelDeploymentUrl
  }

  return process.env.NODE_ENV === "production"
    ? productionAppUrl
    : developmentAppUrl
}
