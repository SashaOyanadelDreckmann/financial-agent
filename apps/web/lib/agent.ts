/* ────────────────────────────────────────────── */
/* Envío al agente central (LIMPIO)               */
/* ────────────────────────────────────────────── */

export async function sendToAgent(payload: {
  user_message: string;
  session_id?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  profile?: unknown;
  user_info?: { name?: string };
}) {
  const { profile, user_info, history, ...rest } = payload;

  /* user_id persistente */
  let userId = 'anonymous';
  try {
    const persisted = localStorage.getItem('user_id');
    if (persisted) userId = persisted;
  } catch {}

  /* history mínimo */
  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h &&
            (h.role === 'user' || h.role === 'assistant') &&
            typeof h.content === 'string' &&
            h.content.trim().length > 0
        )
        .slice(-12)
    : [];

  /* user_name garantizado */
  let resolvedUserInfo = user_info;
  if (!resolvedUserInfo) {
    try {
      const name = localStorage.getItem('user_name');
      if (name) resolvedUserInfo = { name };
    } catch {}
  }

  const body = {
    user_id: userId,
    ...rest,
    history: safeHistory,
    context: {
      ...(profile ? { profile } : {}),
      ...(resolvedUserInfo ? { user_info: resolvedUserInfo } : {}),
    },
  };

  console.log("[DEV] payload.user_message =", payload.user_message);
  const res = await fetch('http://localhost:3000/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let err: any = {};
    try {
      err = await res.json();
    } catch {}
    throw new Error(err.error ?? 'Agent error');
  }

  return res.json();
}
