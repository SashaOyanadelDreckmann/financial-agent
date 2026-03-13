import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail } from '../services/user.service';

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/register', async (req, res) => {
    console.log('BODY RECIBIDO', req.body);
  
    const parsed = RegisterSchema.safeParse(req.body);
  
    if (!parsed.success) {
      console.error('ZOD ERROR', parsed.error.flatten());
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
  
    res.cookie('session', user.id, {
      httpOnly: true,
      sameSite: 'lax',
    });
  
    return res.json({ ok: true });
  });
  