import { NextResponse } from 'next/server';
import clientPromise from '@/app/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const client = await clientPromise;
    const db = client.db("docs");
    const collection = db.collection("embeddings");

    // Perform your MongoDB query here
    // This is a placeholder query, adjust according to your actual data structure
    const results = await collection.find({ $text: { $search: question } }).limit(5).toArray();

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in MongoDB API:', error);
    return NextResponse.json({ error: 'An error occurred during the database operation' }, { status: 500 });
  }
}