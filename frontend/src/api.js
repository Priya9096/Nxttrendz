import Cookies from 'js-cookie'

// The backend address lives here once, read from the environment.
// Change VITE_API_BASE_URL in .env to point at a different backend.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiUrl = path => `${BASE_URL}${path}`

// --- Tokens -----------------------------------------------------------------
// Django hands us two tokens at login. The cookie is just a box to keep them in.
const ACCESS_TOKEN_KEY = 'jwt_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const getAccessToken = () => Cookies.get(ACCESS_TOKEN_KEY)

export const getRefreshToken = () => Cookies.get(REFRESH_TOKEN_KEY)

export const saveTokens = ({access, refresh}) => {
  Cookies.set(ACCESS_TOKEN_KEY, access, {expires: 30})
  Cookies.set(REFRESH_TOKEN_KEY, refresh, {expires: 30})
}

export const clearTokens = () => {
  Cookies.remove(ACCESS_TOKEN_KEY)
  Cookies.remove(REFRESH_TOKEN_KEY)
}

// --- One fetch for the whole app --------------------------------------------
// Every call goes through here, so the base URL, the JSON header and the
// Authorization header are written exactly once.
export const apiFetch = (path, options = {}) => {
  const token = getAccessToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // No token yet (login, public reads)? Then send no Authorization header at
  // all — a header holding "Bearer undefined" is worse than none: Django
  // rejects it as a bad token instead of treating you as an anonymous visitor.
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(apiUrl(path), {...options, headers})
}
