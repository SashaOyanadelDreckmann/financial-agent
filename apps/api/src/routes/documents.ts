/**
 * Parsea documentos PDF/Excel/CSV subidos desde el chat.
 * Retorna el texto extraído para que el agente lo use.
 */

import { Router, Request, Response } from 'express';
import { parseTransactionFile } from '../services/transactionParser.service';

const router = Router();

type ParseRequest = {
  files?: Array<{ name: string; base64: string }>;
};

router.post('/parse', async (req: Request, res: Response) => {
  try {
    const body = req.body as ParseRequest;
    const files = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'Se requieren archivos (files: [{ name, base64 }])' });
    }

    const documents: Array<{ name: string; text: string }> = [];

    for (const f of files.slice(0, 5)) {
      if (!f?.name || typeof f.base64 !== 'string') continue;

      const buffer = Buffer.from(f.base64, 'base64');
      const text = await parseTransactionFile(buffer, f.name);
      documents.push({ name: f.name, text });
    }

    return res.json({ documents });
  } catch (err: any) {
    console.error('[documents/parse]', err);
    return res.status(500).json({ error: err?.message ?? 'Error al parsear documentos' });
  }
});

export default router;
