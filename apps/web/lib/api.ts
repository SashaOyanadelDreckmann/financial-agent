import { getApiBaseUrl } from './apiBase';

export async function nextConversationStep(payload: any) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/conversation/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Error al avanzar la conversación');
  }

  return res.json();
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Error registrando usuario');
  }

  return res.json();
}

export async function loginUser(payload: { email: string; password: string }) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Error iniciando sesión');
  }

  return res.json();
}

export async function logoutUser() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Error cerrando sesión');
  }

  return res.json();
}

export async function injectProfileToAgent(profile: any) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/inject-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ profile }),
  });

  if (!res.ok) {
    throw new Error('Error inyectando perfil');
  }

  return res.json();
}

export async function injectIntakeToAgent(payload: { intake: any; llmSummary?: any }) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/inject-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Error inyectando intake');
  }

  return res.json();
}

export async function removeInjectedIntake() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/remove-injected-intake`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Error removiendo intake inyectado');
  }

  return res.json();
}

export async function getSessionInfo() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/session`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('No session');
  }

  return res.json();
}

export async function parseDocuments(files: Array<{ name: string; base64: string }>) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/documents/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ files }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Error al procesar documentos');
  }

  return res.json() as Promise<{ documents: Array<{ name: string; text: string }> }>;
}

export async function loadSheets() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/sheets`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ sheets: any[] }>;
}

export async function saveSheets(sheets: any[]) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sheets }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getWelcomeMessage() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/welcome`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ message: string }>;
}

export async function removeInjectedProfile() {
  const API_URL = getApiBaseUrl();
  const res = await fetch(`${API_URL}/api/remove-injected-profile`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to remove injected profile');
  }

  return res.json();
}
