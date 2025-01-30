import { NextResponse } from 'next/server';
import { VectorStore } from '../../../lib/langchain/vectorstore';

export async function GET() {
  try {
    const documents = await VectorStore.getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 