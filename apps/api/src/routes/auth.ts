import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail } from '../services/user.service';
import {
  createSession,
  destroySession,
  getSessionCookieOptions,
} from '../services/session.service';

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  const existing = findUserByEmail(data.email);
  if (existing) {
    return res.status(400).json({ error: 'Usuario ya existe' });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = createUser({
    name: data.name,
    email: data.email,
    passwordHash,
  });

  const session = createSession(user.id);
  res.cookie('session', session.token, getSessionCookieOptions());

  return res.json({ ok: true });
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const session = createSession(user.id);
  res.cookie('session', session.token, getSessionCookieOptions());
  return res.json({ ok: true });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.session;
  if (token) destroySession(token);

  res.clearCookie('session', { path: '/' });
  return res.json({ ok: true });
});
  