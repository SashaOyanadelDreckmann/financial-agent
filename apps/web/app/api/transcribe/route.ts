import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No audio' }, { status: 400 });
  }

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'es',
  });

  return NextResponse.json({
    text: transcription.text,
  });
}
