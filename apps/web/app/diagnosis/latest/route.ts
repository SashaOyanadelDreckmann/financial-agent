import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'http://localhost:3000/diagnosis/latest',
      {
        cache: 'no-store',
        credentials: 'include',
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener diagnóstico' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error conectando con backend' },
      { status: 500 }
    );
  }
}
