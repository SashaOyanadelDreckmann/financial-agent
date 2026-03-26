/**
 * Extrae texto/datos de cartolas PDF, Excel y CSV para RAG.
 */

import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

const DATA_ROOT = path.join(process.cwd(), 'data', 'transactions');

export type ParsedTransaction = {
  source: string;
  text: string;
  rows?: string[][];
};

/**
 * Parsea un buffer de PDF y retorna texto plano.
 */
export async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<string> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (result?.text || '').trim();
    await parser.destroy();
    if (!text) return `[PDF ${filename}: sin texto extraíble]`;
    return `--- Documento PDF: ${filename} ---\n${text}\n--- Fin ---`;
  } catch (e) {
    if (parser) try { await parser.destroy(); } catch {}
    return `[PDF ${filename}: error al extraer texto - ${String(e)}]`;
  }
}

/**
 * Parsea un buffer de Excel (.xls, .xlsx) y retorna texto tabular.
 */
export function parseExcelBuffer(buffer: Buffer, filename: string): string {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
    const lines: string[] = [`--- Cartola Excel: ${filename} ---`];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ', RS: '\n' });
      if (csv.trim()) {
        lines.push(`\n[Hoja: ${sheetName}]\n${csv}`);
      }
    }
    lines.push('\n--- Fin ---');
    return lines.join('\n');
  } catch (e) {
    return `[Excel ${filename}: error al extraer - ${String(e)}]`;
  }
}

/**
 * Parsea un buffer de CSV (texto UTF-8).
 */
export function parseCsvBuffer(buffer: Buffer, filename: string): string {
  try {
    const text = buffer.toString('utf-8').trim();
    if (!text) return `[CSV ${filename}: vacío]`;
    return `--- Cartola CSV: ${filename} ---\n${text}\n--- Fin ---`;
  } catch (e) {
    return `[CSV ${filename}: error - ${String(e)}]`;
  }
}

/**
 * Detecta tipo de archivo y parsea.
 */
export async function parseTransactionFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return parsePdfBuffer(buffer, filename);
  if (ext === '.xlsx' || ext === '.xls') return parseExcelBuffer(buffer, filename);
  if (ext === '.csv') return parseCsvBuffer(buffer, filename);
  return `[${filename}: formato no soportado (${ext})]`;
}

/**
 * Guarda el contenido extraído en la carpeta RAG para la sesión.
 */
export function saveToRag(sessionId: string, filename: string, content: string): string {
  const dir = path.join(DATA_ROOT, sanitizeSessionId(sessionId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base = path.basename(filename, path.extname(filename));
  const safeName = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const outPath = path.join(dir, `${safeName}.txt`);
  fs.writeFileSync(outPath, content, 'utf-8');
  return outPath;
}

function sanitizeSessionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'default';
}

/**
 * Ruta absoluta de la carpeta de transacciones para una sesión (para RAG).
 */
export function getTransactionsDir(sessionId: string): string {
  return path.join(DATA_ROOT, sanitizeSessionId(sessionId));
}
