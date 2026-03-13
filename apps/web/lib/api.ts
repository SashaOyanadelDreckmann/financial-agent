const API_URL = 'http://localhost:3000';

export async function nextConversationStep(payload: any) {
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

export async function injectProfileToAgent(profile: any) {
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
  const res = await fetch(`${API_URL}/api/session`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('No session');
  }

  return res.json();
}

export async function removeInjectedProfile() {
  const res = await fetch(`${API_URL}/api/remove-injected-profile`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to remove injected profile');
  }

  return res.json();
}
