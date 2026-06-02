const base = import.meta.env.VITE_API_BASE || 'http://localhost/CMS/backend/index.php';

/** Persists session; sent as X-Session-Id + Authorization Bearer (PHP may drop one of them). */
export const SESSION_STORAGE_KEY = 'cms_session_id';

function getStoredSessionId() {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionId(id) {
  try {
    if (id) localStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Headers for authenticated API calls (including multipart uploads). */
export function getSessionHeaders() {
  const sid = getStoredSessionId();
  if (!sid) return {};
  return {
    'X-Session-Id': sid,
    Authorization: `Bearer ${sid}`,
  };
}

function resolveBase() {
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return base;
  }
  if (typeof window !== 'undefined') {
    return new URL(base, window.location.origin).toString();
  }
  return base;
}

export function apiUrl(route, params = {}) {
  const resolved = resolveBase();
  const u = new URL(resolved, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  u.searchParams.set('route', route);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  });
  return u.toString();
}

export async function api(route, options = {}) {
  const { params, method = 'GET', body, headers: extraHeaders, ...rest } = options;
  const url = apiUrl(route, params || {});

  const headers = { ...getSessionHeaders(), ...extraHeaders };
  const opts = {
    method,
    credentials: 'include',
    ...rest,
  };
  if (body !== undefined && method !== 'GET' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  if (Object.keys(headers).length) opts.headers = headers;

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.session_id) {
    setStoredSessionId(data.session_id);
  }
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredSession();
    }
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
