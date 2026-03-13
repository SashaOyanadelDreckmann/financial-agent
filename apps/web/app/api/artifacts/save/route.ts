import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

type Body = {
  id: string;
  title?: string;
  fileUrl?: string; // puede ser relativa (/pdfs/...) o absoluta (http...)
};

function safeId(id: string) {
  return String(id || 'artifact')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

async function fetchPdfBytes(fileUrl: string) {
  // Si viene relativa, asumimos que es servida desde el mismo host.
  // En local suele ser /pdfs/... (public), o desde backend.
  const isAbs = /^https?:\/\//i.test(fileUrl);
  const url = isAbs ? fileUrl : `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3001'}${fileUrl}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo descargar PDF (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    if (!body?.fileUrl) {
      return NextResponse.json({ error: 'Missing fileUrl' }, { status: 400 });
    }

    const id = safeId(body.id);
    const outDir = path.join(process.cwd(), 'public', 'pdfs', 'simulaciones');
    const outPath = path.join(outDir, `${id}.pdf`);
    await fs.mkdir(outDir, { recursive: true });

    const bytes = await fetchPdfBytes(body.fileUrl);
    await fs.writeFile(outPath, bytes);

    const publicUrl = `/pdfs/simulaciones/${id}.pdf`;
    return NextResponse.json({ ok: true, publicUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Save error' },
      { status: 500 }
    );
  }
}
