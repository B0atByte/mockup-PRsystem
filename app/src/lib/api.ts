// BASE_URL ว่างเพื่อให้ Vite proxy จัดการใน dev, Nginx จัดการใน production
const BASE_URL = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token') || ''
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data as T
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      req<{ token: string; user: any }>('POST', '/api/auth/login', { username, password }),
    me: () => req<any>('GET', '/api/auth/me'),
  },
  requests: {
    list: () => req<any[]>('GET', '/api/requests'),
    create: (data: unknown) => req<any>('POST', '/api/requests', data),
    updateStatus: (id: string, data: unknown) =>
      req<any>('PATCH', `/api/requests/${id}/status`, data),
  },
  users: {
    list: () => req<any[]>('GET', '/api/users'),
    create: (data: unknown) => req<any>('POST', '/api/users', data),
    update: (id: string, data: unknown) => req<any>('PUT', `/api/users/${id}`, data),
    delete: (id: string) => req<{ ok: boolean }>('DELETE', `/api/users/${id}`),
    resetPassword: (id: string) =>
      req<{ ok: boolean }>('POST', `/api/users/${id}/reset-password`, {}),
  },
  audit: {
    list: () => req<any[]>('GET', '/api/audit'),
    log: (data: { action: string; module: string; detail: string }) =>
      req<any>('POST', '/api/audit', data),
  },
  settings: {
    get: () => req<any>('GET', '/api/settings'),
    update: (data: { siteName?: string; siteSubtitle?: string; logoUrl?: string | null }) =>
      req<any>('PUT', '/api/settings', data),
  },
  files: {
    upload: async (file: File): Promise<{ url: string; name: string }> => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE_URL}/api/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json().catch(() => ({ error: 'Network error' }))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      return data
    },
    open: (url: string) => {
      window.open(`${BASE_URL}${url}`, '_blank')
    },
  },
}
