/**
 * URL utilities for consistent relative navigation
 * Prevents hardcoded localhost references
 */

/**
 * Convert a path to an origin-safe URL
 * Always returns relative paths to prevent localhost issues
 */
export function toOriginPath(path: string): string {
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  
  // For now, always return relative paths
  // This prevents any hardcoded localhost references
  return path
}

/**
 * Build a safe redirect URL
 * @param path - The path to redirect to
 * @param request - Optional request object for server-side redirects
 */
export function buildRedirectUrl(path: string, request?: Request): string {
  const safePath = toOriginPath(path)
  
  // Server-side: build from request URL
  if (request) {
    const url = new URL(request.url)
    url.pathname = safePath
    url.search = '' // Clear any query params unless needed
    return url.toString()
  }
  
  // Client-side: use relative path
  return safePath
}
