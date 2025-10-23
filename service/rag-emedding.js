const fs = require("fs").promises;
const { Pool } = require("pg");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
const axios = require('axios'); // You already have this

// Global instances
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const embeddings = new HuggingFaceInferenceEmbeddings({
  model: "sentence-transformers/all-MiniLM-L6-v2",
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// 🔥 DIRECT OLLAMA HTTP API (No LangChain!)
async function callOllama(prompt) {
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: "mistral",  // Change to "llama3.1" if downloaded
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
      }
    }, {
      timeout: 30000,
    });

    return response.data.response || "No response generated";
  } catch (error) {
    throw new Error(`Ollama failed: ${error.response?.data?.error || error.message}`);
  }
}

// 🔥 VECTOR FORMAT FIXER
function fixEmbeddingForPgvector(embedding) {
  if (typeof embedding === 'string' && embedding.startsWith('{') && embedding.endsWith('}')) {
    return `[${embedding.slice(1, -1)}]`;
  }
  if (Array.isArray(embedding)) {
    return `[${embedding.join(',')}]`;
  }
  if (embedding && embedding.data && Array.isArray(embedding.data)) {
    return `[${embedding.data.join(',')}]`;
  }
  throw new Error(`Invalid embedding format: ${typeof embedding}`);
}

// 🧠 RETRIEVAL FUNCTION
async function retrieveRules(query, projectId, maxResults = 5) {
  try {
    const rawEmbedding = await embeddings.embedQuery(query);
    const queryEmbedding = fixEmbeddingForPgvector(rawEmbedding);
    
    console.log(`🔍 Query embedding fixed: ${queryEmbedding.slice(0, 50)}...`);
    
    const result = await pool.query(`
      SELECT content, 1 - (embedding <=> $1::vector) AS similarity
      FROM documents 
      WHERE project_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, [queryEmbedding, projectId, maxResults]);
    
    const rules = result.rows
      .filter(row => row.similarity > 0.5)
      .map(row => `📋 ${row.content.trim()}`)
      .join("\n\n");
    
    return rules || "No relevant business rules found.";
  } catch (error) {
    console.error("Retrieval error:", error);
    return "No business rules available.";
  }
}

// 🔥 MAIN CHAT FUNCTION - DIRECT OLLAMA API
async function chatWithRules(message, projectId) {
  try {
    const context = await retrieveRules(message, projectId);
    
    const fullPrompt = `You are an expert software architect. Answer using ONLY these business rules:

CONTEXT:
${context}

QUESTION: ${message}

Respond EXACTLY in this format:

**BUSINESS RULES**
Summary of key rules from context

**IMPLEMENTATION**
1. Step 1
2. Step 2
3. Step 3

**CODE**
\`\`\`typescript
// Complete working function - ready to copy-paste
function example() {
  // Full implementation here
}
\`\`\`

**EDGE CASES**
• Case 1
• Case 2

**TESTS**
\`\`\`typescript
test('should handle case', () => {
  // Complete test here
});
\`\`\``;

    console.log(`🤖 Ollama Direct API: Processing...`);
    
    const response = await callOllama(fullPrompt);
    console.log(response);
    return {
      success: true,
      message: response,
      contextPreview: context.substring(0, 200) + "...",
      toolsUsed: 1,
      model: "Ollama Mistral (Direct API)",
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      message: `Error: ${error.message}. Make sure Ollama is running: 'ollama serve'`,
      toolsUsed: 0,
    };
  }
}

// 📄 INGESTION FUNCTION (unchanged)
async function ingestDocument(filePath, projectId) {
  try {
    const fileText = await fs.readFile(filePath, "utf8");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const docs = await splitter.createDocuments([fileText]);
    
    console.log(`📄 ${docs.length} chunks created`);

    const rawVectors = await embeddings.embedDocuments(
      docs.map((doc) => doc.pageContent)
    );

    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    let validChunks = 0;

    for (let i = 0; i < docs.length; i++) {
      try {
        const rawEmbedding = rawVectors[i];
        const fixedEmbedding = fixEmbeddingForPgvector(rawEmbedding);
        const chunkContent = docs[i].pageContent;
        
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
        values.push(projectId, filePath, chunkContent, fixedEmbedding);
        paramIndex += 4;
        validChunks++;
      } catch (e) {
        console.error(`❌ Skipping chunk ${i}:`, e.message);
      }
    }

    if (validChunks === 0) {
      throw new Error("No valid embeddings generated");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const queryText = `INSERT INTO documents (project_id, file_name, content, embedding) VALUES ${placeholders.join(", ")}`;
      const result = await client.query(queryText, values);
      await client.query("COMMIT");
      console.log(`✅ Ingested ${result.rowCount} documents`);
      return result.rowCount;
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Ingestion failed:`, error);
    throw error;
  }
}

module.exports = { chatWithRules, ingestDocument };