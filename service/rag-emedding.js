const fs = require("fs").promises;
const { Pool } = require("pg");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
const axios = require('axios');

// Global instances
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const embeddings = new HuggingFaceInferenceEmbeddings({
  model: "sentence-transformers/all-MiniLM-L6-v2",
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// 🔥 FIXED OLLAMA API WITH BETTER ERROR HANDLING
async function callOllama(prompt) {
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: "mistral",
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
      }
    }, {
      timeout: 60000, // 60s timeout
    });

    return response.data.response || "No response generated";
  } catch (error) {
    console.error('Ollama Debug:', error.response?.data || error.message);
    throw new Error(`Ollama failed: ${error.response?.data?.error || error.message}`);
  }
}

// 🔥 FIXED VECTOR FORMATTER
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

// 🔥 FIXED RETRIEVAL - LOWER THRESHOLD + DEBUG
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
    
    console.log(`📊 Found ${result.rows.length} documents`);
    result.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. Similarity: ${row.similarity.toFixed(3)}`);
    });
    
    // 🔥 FIXED: Lower threshold to 0.3 + take top 3 even if low similarity
    const relevantRules = result.rows
      .slice(0, 3)  // Top 3 results
      .filter(row => row.similarity > 0.3)  // Lower threshold
      .map(row => `📋 ${row.content.trim()}`)
      .join("\n\n");
    
    const rules = relevantRules || result.rows.slice(0, 3).map(row => `📋 ${row.content.trim()}`).join("\n\n") || "No documents found";
    
    console.log(`✅ Retrieved ${relevantRules ? 'relevant' : 'all'} rules (${rules.length} chars)`);
    return rules;
  } catch (error) {
    console.error("Retrieval error:", error);
    return "No business rules available.";
  }
}

// 🔥 FIXED CHAT - BETTER PROMPT FOR CONTEXT AWARENESS
async function chatWithRules(message, projectId) {
  try {
    const context = await retrieveRules(message, projectId);
    
    // 🔥 IMPROVED PROMPT - Forces context usage
    const fullPrompt = `You are an expert software architect working on the **Stratik Backend** project.

**MANDATORY**: You MUST use the business rules context below to answer. If the context doesn't contain the exact answer, say "The business rules documentation doesn't specify this detail."

**BUSINESS RULES CONTEXT** (Use ONLY this information):
${context}

**QUESTION**: ${message}

**CRITICAL INSTRUCTIONS**:
1. Answer using ONLY the business rules above
2. If question is about modules → Answer "6 core modules" from context
3. ALWAYS follow this exact format:

**BUSINESS RULES**
[Direct quotes/extracts from context answering the question]

**IMPLEMENTATION**
[Steps based on business rules]

**CODE**
\`\`\`typescript
// Complete NestJS implementation following business rules
\`\`\`

**EDGE CASES**
• [From business rules]

**TESTS**
\`\`\`typescript
// Jest tests
\`\`\``;

    console.log(`🤖 Ollama: Processing "${message}"...`);
    console.log(`📏 Context length: ${context.length} chars`);
    
    const response = await callOllama(fullPrompt);

    console.log("🤖 Ollama response:", response);

    return {
      success: true,
      message: response,
      contextPreview: context.substring(0, 300) + "...",
      contextLength: context.length,
      toolsUsed: 1,
      model: "Ollama Mistral",
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      toolsUsed: 0,
    };
  }
}

// 🔥 FIXED INGESTION WITH DEBUG
async function ingestDocument(filePath, projectId) {
  try {
    const fileText = await fs.readFile(filePath, "utf8");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200, // Increased overlap
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

    // 🔥 DELETE OLD DOCUMENTS FIRST
    await pool.query('DELETE FROM documents WHERE project_id = $1', [projectId]);
    console.log(`🗑️ Cleared old documents for project ${projectId}`);

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