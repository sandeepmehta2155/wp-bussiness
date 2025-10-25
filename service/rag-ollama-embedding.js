const fs = require("fs").promises;
const { Pool } = require("pg");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const axios = require('axios');

// 🔥 FIXED: Sequential Ollama Embeddings (1 prompt at a time)
async function ollamaEmbedSingle(text) {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: "nomic-embed-text",
    prompt: text,  // ✅ SINGLE STRING ONLY
    options: { truncate: true }
  }, { timeout: 10000 });
  
  return response.data.embedding;
}

// 🔥 FIXED: Process batch sequentially with concurrency limit
async function ollamaEmbeddings(texts) {
  const embeddings = [];
  
  // Process 3 at a time for speed
  const concurrency = 3;
  const chunks = [];
  
  for (let i = 0; i < texts.length; i += concurrency) {
    chunks.push(texts.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(text => ollamaEmbedSingle(text));
    const chunkEmbeddings = await Promise.all(promises);
    embeddings.push(...chunkEmbeddings);
  }
  
  return embeddings;
}

// 🔥 FIXED: Single query embedding
async function embedQuery(query) {
  return await ollamaEmbedSingle(query);
}

// Global instances
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/pgboss_wp' });

// 🔥 OLLAMA LLM (unchanged)
async function callOllama(prompt) {
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: "qwen2.5-coder:7b",  // Or "mistral"
    prompt: prompt,
    stream: false,
    options: { temperature: 0.1, num_predict: 2000 }
  }, { timeout: 60000 });
  return response.data.response || "No response generated";
}

// 🔥 VECTOR FORMATTER (384 dims)
function fixEmbeddingForPgvector(embedding) {
  if (Array.isArray(embedding)) {
    return `[${embedding.join(',')}]`;
  }
  throw new Error(`Invalid embedding format: ${typeof embedding}`);
}

// 🧠 RETRIEVAL (unchanged)
async function retrieveRules(query, projectId, maxResults = 5) {
  try {
    console.time('🔍 Embedding');
    const queryEmbedding = fixEmbeddingForPgvector(await embedQuery(query));
    console.timeEnd('🔍 Embedding');
    
    console.log(`🔍 Query embedding fixed: ${queryEmbedding.slice(0, 50)}...`);
    
    const result = await pool.query(`
      SELECT content, 1 - (embedding <=> $1::vector) AS similarity
      FROM documents 
      WHERE project_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, [queryEmbedding, projectId, maxResults]);
    
    console.log(`📊 Found ${result.rows.length} documents`);
    
    const relevantRules = result.rows
      .slice(0, 3)
      .filter(row => row.similarity > 0.3)
      .map(row => `📋 ${row.content.trim()}`)
      .join("\n\n") || result.rows.slice(0, 3).map(row => `📋 ${row.content.trim()}`).join("\n\n");
    
    return relevantRules || "No documents found";
  } catch (error) {
    console.error("Retrieval error:", error);
    return "No business rules available.";
  }
}

// 🔥 MAIN CHAT (unchanged)
async function chatWithRules(message, projectId) {
  try {
    const context = await retrieveRules(message, projectId);

    // 🔥 EXTRACT MODULE FROM QUESTION
    const moduleMatch = message.match(/callout|resource|roster|destination|form|user/i);
    const detectedModule = moduleMatch ? moduleMatch[0] : 'Resource';
    
    const fullPrompt = `You are Stratik Backend AI Architect.

    **MANDATORY**: You MUST use the business rules context below to answer. If the context doesn't contain the exact answer, say "The business rules documentation doesn't specify this detail."

    **BUSINESS RULES**:
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
    
    **EXACT FORMAT**:
    **🎯 MODULE**: ${detectedModule}
    
    **📋 BUSINESS RULES APPLIED**
    [Direct quotes/extracts from context answering the question]
    
    **IMPLEMENTATION**
    [Steps based on business rules]
    
    **EDGE CASES**
    • [From business rules]
    
    **✅ READY TO COPY-PASTE**`;

    console.time('🤖 LLM');
    const response = await callOllama(fullPrompt);
    console.timeEnd('🤖 LLM');
    console.log("🤖 LLM response:", response);

    return {
      success: true,
      message: response,
      detectedModule,
      contextLength: context.length,
      toolsUsed: 2,
      model: "Qwen2.5-Coder (100% Local)",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`,
      toolsUsed: 0,
    };
  }
}

// 🔥 FIXED INGESTION - Sequential embeddings
async function ingestDocument(filePath, projectId) {
  try {
    const fileText = await fs.readFile(filePath, "utf8");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([fileText]);
    
    console.log(`📄 ${docs.length} chunks created`);

    console.time('🔥 Embedding all chunks');
    const texts = docs.map(doc => doc.pageContent);
    const embeddingsBatch = await ollamaEmbeddings(texts); // FIXED: Sequential
    console.timeEnd('🔥 Embedding all chunks');

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (let i = 0; i < docs.length; i++) {
      const fixedEmbedding = fixEmbeddingForPgvector(embeddingsBatch[i]);
      const chunkContent = docs[i].pageContent;
      
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      values.push(projectId, filePath, chunkContent, fixedEmbedding);
      paramIndex += 4;
    }

    // Clear old docs
    await pool.query('DELETE FROM documents WHERE project_id = $1', [projectId]);
    console.log(`🗑️ Cleared old documents`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const queryText = `INSERT INTO documents (project_id, file_name, content, embedding) VALUES ${placeholders.join(", ")}`;
      const result = await client.query(queryText, values);
      await client.query("COMMIT");
      console.log(`✅ Ingested ${result.rowCount} documents (768 dims)`);
      return result.rowCount;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Ingestion failed:`, error);
    throw error;
  }
}

module.exports = { chatWithRules, ingestDocument };