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
