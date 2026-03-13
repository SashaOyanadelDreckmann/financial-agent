import * as fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type SimulationPdfInput = {
  title: string;
  content: string;
};

export async function generateSimulationPdf(input: SimulationPdfInput) {
  const id = crypto.randomUUID();

  const outDir = path.join(
    process.cwd(),
    'apps/web/public/pdfs/simulaciones'
  );

  const outPath = path.join(outDir, `${id}.pdf`);

  await fs.mkdir(outDir, { recursive: true });

  const fakePdf = `
SIMULACIÓN FINANCIERA

Título: ${input.title}

${input.content}
`;

  await fs.writeFile(outPath, fakePdf);

  return {
    id,
    type: 'pdf' as const,
    title: input.title,
    fileUrl: `/pdfs/simulaciones/${id}.pdf`,
    source: 'simulation',
    createdAt: new Date().toISOString(),
  };
}
