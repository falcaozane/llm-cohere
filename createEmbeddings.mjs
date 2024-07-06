import { promises as fsp } from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MongoDBAtlasVectorSearch } from "langchain/vectorstores/mongodb_atlas";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const client = new MongoClient("mongodb+srv://admin:admin@cluster0.54ttjgq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
const dbName = "docs";
const collectionName = "embeddings";
const collection = client.db(dbName).collection(collectionName);

const genAI = new GoogleGenerativeAI("AIzaSyAvgd8OT8ptXMYYQvuwnbMPwfnfmG2CgQY");

// Custom embeddings class to work with Gemini
class GeminiEmbeddings {
  async embedDocuments(texts) {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const results = await Promise.all(texts.map(text => model.embedContent(text)));
    return results.map(result => result.embedding);
  }

  async embedQuery(text) {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding;
  }
}

const docs_dir = "_assets/fcc_docs";

async function main() {
  const fileNames = await fsp.readdir(docs_dir);
  console.log(fileNames);

  for (const fileName of fileNames) {
    const document = await fsp.readFile(`${docs_dir}/${fileName}`, "utf8");
    console.log(`Vectorizing ${fileName}`);

    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 2000,
      chunkOverlap: 50,
    });

    const output = await splitter.createDocuments([document]);

    await MongoDBAtlasVectorSearch.fromDocuments(
      output,
      new GeminiEmbeddings(),
      {
        collection,
        indexName: "default",
        textKey: "text",
        embeddingKey: "embedding",
      }
    );
  }

  console.log("Done: Closing Connection");
  await client.close();
}

main().catch(console.error);