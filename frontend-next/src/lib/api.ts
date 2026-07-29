const API_URL = import.meta.env.VITE_API_URL

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = localStorage.getItem('insforge_access_token')
    // FormData must set its own multipart Content-Type (it carries the boundary).
    const isFormData = options.body instanceof FormData
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const baseUrl = API_URL ? API_URL.replace(/\/api\/?$/, '') : ''
    const url = `${baseUrl}/api${endpoint}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, { ...options, headers, signal: controller.signal })
    clearTimeout(timeout)

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return { data: null, error: `Server returned non-JSON response (${res.status}). URL: ${url}` }
    }

    const json = await res.json()

    if (!res.ok) {
      return { data: null, error: json.error || 'Request failed' }
    }

    return { data: json.data || json, error: null }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { data: null, error: 'Request timed out. Please try again.' }
    }
    return { data: null, error: err?.message || 'Network error' }
  }
}

const encode = (body?: any) =>
  body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)

export const api = {
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body: encode(body) }),
  patch: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'PATCH', body: encode(body) }),
  put: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'PUT', body: encode(body) }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T = any>(url: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('insforge_access_token')
    const headers: HeadersInit = {}
    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    return request<T>(url, { method: 'POST', body: formData, headers })
  },
}
