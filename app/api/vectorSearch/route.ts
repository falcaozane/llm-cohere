import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { CohereEmbeddings } from "@langchain/cohere";
import clientPromise from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log("Starting vector search...");

    // Connect to MongoDB client
    const client = await clientPromise;
    console.log("MongoDB client connected");

    const namespace = "docs.embeddings";
    const [dbName, collectionName] = namespace.split(".");
    const collection = client.db(dbName).collection(collectionName);
    console.log(`Using database: ${dbName}, collection: ${collectionName}`);

    // Retrieve the question from the request body
    let question: string;
    const contentType = req.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      question = body.question;
    } else {
      question = await req.text();
    }

    if (!question) {
      console.log("No question provided");
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log("Received question:", question);

    // Initialize the vector store
    const vectorStore = new MongoDBAtlasVectorSearch(
      new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: "embed-english-v3.0",
      }),
      {
        collection,
        indexName: "default", // The name of the Atlas search index. Defaults to "default"
        textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
        embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
      }
    );
    console.log("Vector store initialized");

    // Perform the similarity search
    const resultOne = await vectorStore.similaritySearch(question, 1);
    console.log("Search results:", JSON.stringify(resultOne, null, 2));

    // Close the MongoDB client
    await client.close();

    // Format the search results
    const formattedOutput = resultOne.map(doc => ({
      text: doc.pageContent,
      metadata: doc.metadata
    }));

    console.log("Formatted output:", JSON.stringify(formattedOutput, null, 2));

    // Return the search results as JSON response
    return NextResponse.json({ results: formattedOutput });
  } catch (error: unknown) {
    console.error('Error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'An error occurred during the search', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'An unknown error occurred during the search' }, { status: 500 });
    }
  }
}
