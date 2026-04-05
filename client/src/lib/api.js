const BASE_URL = import.meta.env.VITE_API_URL ?? '';

function getToken() {
  try {
    // Tech token takes priority; fall back to client token
    return (
      localStorage.getItem('naily_token') ??
      localStorage.getItem('naily_client_token') ??
      null
    );
  } catch {
    return null;
  }
}

function isClientPath(path) {
  return path.startsWith('/api/client-auth');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // On 401: only clear the token type that was actually used
    if (response.status === 401) {
      if (isClientPath(path)) {
        localStorage.removeItem('naily_client_token');
        localStorage.removeItem('naily_client_user');
      } else {
        localStorage.removeItem('naily_token');
        localStorage.removeItem('naily_user');
      }
    }
    const message =
      data?.error ||
      (data?.errors?.[0]?.msg) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
