// API client that ensures cookies are always sent with requests

interface FetchOptions extends RequestInit {
  headers?: HeadersInit
}

export async function apiClient(url: string, options: FetchOptions = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    // If we get a 401, the auth has failed - likely a cookie issue
    if (response.status === 401) {
      console.error(`[API] Auth failed for ${url} - cookies may not be sent properly`)
      // Could trigger a re-auth flow here
    }
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }
  
  return response
}

// Convenience methods
export const api = {
  get: (url: string) => apiClient(url, { method: 'GET' }),
  
  post: (url: string, data: any) => apiClient(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  put: (url: string, data: any) => apiClient(url, {
    method: 'PUT', 
    body: JSON.stringify(data),
  }),
  
  delete: (url: string) => apiClient(url, { method: 'DELETE' }),
}
