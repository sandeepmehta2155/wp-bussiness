const fs = require("fs").promises; // Use promises for async
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const pkg = require("pg");
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");

const embeddings = new HuggingFaceInferenceEmbeddings({
  model: "sentence-transformers/all-MiniLM-L6-v2",
  apiKey: process.env.HUGGINGFACE_API_KEY,
  apiUrl: "https://api-inference.huggingface.co",
});

async function ingestDocument(filePath, projectId) {
  try {
    // Async file read
    const fileText = await fs.readFile(filePath, "utf8");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const docs = await splitter.createDocuments([fileText]);

    // Batch embed all chunks in one API call
    const embeddedVectors = await embeddings.embedDocuments(
      docs.map((doc) => doc.pageContent)
    );

    // Prepare data for batch insert
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (let i = 0; i < docs.length; i++) {
      const chunkContent = docs[i].pageContent;
      const embedding = embeddedVectors[i];

      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(`Invalid embedding for chunk ${i}: Expected 384-dimensional array.`);
      }

      console.log(embedding);

      const embeddingStr = `[${embedding.join(',')}]`;

      // Build placeholders for this row (e.g., ($1, $2, $3, $4))
      placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);

      values.push(projectId, filePath, chunkContent, embeddingStr);
    }

    if (values.length === 0) {
      console.log("No documents to ingest.");
      return;
    }

    // Single multi-row INSERT query
    const queryText = `
      INSERT INTO documents (project_id, file_name, content, embedding)
      VALUES ${placeholders.join(", ")}
    `;

    const client = await pool.connect();
    try {
      await client.query("BEGIN"); // Start transaction
      await client.query(queryText, values);
      await client.query("COMMIT"); // Commit if successful
      console.log(`✅ Ingested ${docs.length} documents from ${filePath}`);
    } catch (dbErr) {
      await client.query("ROLLBACK"); // Rollback on error
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Error ingesting ${filePath}:`, error);
    throw error; // Re-throw for caller handling
  }
}

module.exports = {
  embeddings,
  ingestDocument,
};