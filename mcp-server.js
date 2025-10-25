#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Import our embedding and RAG modules
const fs = require("fs").promises;
const { Pool } = require("pg");
const { ingestDocument, chatWithRules } = require("./service/rag-ollama-embedding.js");
const path = require("path");

// Setup logging
const logFile = path.join(__dirname, 'mcp-server.log');
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFile(logFile, logMessage).catch(console.error);
  console.log(message); // Also log to console
};
// Initialize database connection
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/pgboss_wp' });

// Create MCP server
const server = new Server(
  {
    name: "ai-embedding-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logToFile("🔧 [MCP] ListToolsRequestSchema - Listing available tools");
  return {
    tools: [
      {
        name: "ingest_document",
        description: "Ingest a document into the vector database for RAG functionality",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Path to the document file to ingest",
            },
            projectId: {
              type: "string",
              description: "Project ID to associate the document with",
            },
          },
          required: ["filePath", "projectId"],
        },
      },
      {
        name: "chat_with_rules",
        description: "Chat with the AI using business rules context from ingested documents",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The user's question or message",
            },
            projectId: {
              type: "string",
              description: "Project ID to search for relevant business rules",
            },
          },
          required: ["message", "projectId"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();
  
  logToFile(`🚀 [MCP] Tool Call Started: ${name}`);
  logToFile(`📝 [MCP] Tool Arguments: ${JSON.stringify(args, null, 2)}`);
  logToFile(`⏰ [MCP] Start Time: ${new Date().toISOString()}`);
  
  try {
    switch (name) {
      case "ingest_document": {
        const { filePath, projectId } = args;
        logToFile(`📄 [MCP] Ingest Document - File: ${filePath}, Project: ${projectId}`);
        
        // Check if file exists
        try {
          await fs.access(filePath);
          logToFile(`✅ [MCP] File exists: ${filePath}`);
        } catch (error) {
          logToFile(`❌ [MCP] File not found: ${filePath}`);
          throw new Error(`File not found: ${filePath}`);
        }

        logToFile(`🔄 [MCP] Starting document ingestion...`);
        const result = await ingestDocument(filePath, projectId);
        logToFile(`✅ [MCP] Document ingestion completed. Processed ${result} chunks`);
        
        const response = {
          content: [
            {
              type: "text",
              text: `✅ Successfully ingested document: ${filePath}\n📊 Processed ${result} chunks\n🔗 Project ID: ${projectId}`,
            },
          ],
        };
        
        logToFile(`📤 [MCP] Ingest Document Response: ${JSON.stringify(response, null, 2)}`);
        return response;
      }

      case "chat_with_rules": {
        const { message, projectId } = args;
        logToFile(`💬 [MCP] Chat with Rules - Message: "${message}", Project: ${projectId}`);
        
        logToFile(`🔄 [MCP] Starting RAG chat processing...`);
        const result = await chatWithRules(message, projectId);
        logToFile(`✅ [MCP] RAG chat processing completed. Success: ${result.success}`);
        logToFile(`🔍 [MCP] Raw result from chatWithRules: ${JSON.stringify(result, null, 2)}`);
        
        if (result.success) {
          const response = {
            content: [
              {
                type: "text",
                text: `🤖 **AI Response** (${result.model}):\n\n${result.message}\n\n---\n📊 **Context Stats:**\n- Context length: ${result.contextLength} characters\n- Tools used: ${result.toolsUsed}\n- Detected module: ${result.detectedModule || 'N/A'}`,
              },
            ],
          };
          
          logToFile(`📤 [MCP] Chat with Rules Response (Success): ${JSON.stringify({
            model: result.model,
            contextLength: result.contextLength,
            toolsUsed: result.toolsUsed,
            detectedModule: result.detectedModule,
            messageLength: result.message?.length || 0,
            message: result.message,
            hasContext: !!result.context,
            allKeys: Object.keys(result)
          }, null, 2)}`);
          
          return response;
        } else {
          const response = {
            content: [
              {
                type: "text",
                text: `❌ **Error**: ${result.message}`,
              },
            ],
          };
          
          logToFile(`📤 [MCP] Chat with Rules Response (Error): ${JSON.stringify(response, null, 2)}`);
          return response;
        }
      }

      default:
        logToFile(`❌ [MCP] Unknown tool requested: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logToFile(`❌ [MCP] Tool Call Error: ${name}`);
    logToFile(`🚨 [MCP] Error Message: ${error.message}`);
    logToFile(`⏱️ [MCP] Duration: ${duration}ms`);
    logToFile(`⏰ [MCP] End Time: ${new Date().toISOString()}`);
    
    const errorResponse = {
      content: [
        {
          type: "text",
          text: `❌ **Error executing ${name}:** ${error.message}`,
        },
      ],
      isError: true,
    };
    
    logToFile(`📤 [MCP] Error Response: ${JSON.stringify(errorResponse, null, 2)}`);
    return errorResponse;
  } finally {
    const endTime = Date.now();
    const duration = endTime - startTime;
    logToFile(`🏁 [MCP] Tool Call Completed: ${name} (${duration}ms)`);
    logToFile(`⏰ [MCP] End Time: ${new Date().toISOString()}`);
    logToFile(`─`.repeat(80));
  }
});

// Start the server
async function main() {
  logToFile("🚀 [MCP] Starting AI Embedding MCP Server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToFile("✅ [MCP] AI Embedding MCP Server running on stdio");
  logToFile("📋 [MCP] Available tools: ingest_document, chat_with_rules");
  logToFile("─".repeat(80));
}

main().catch((error) => {
  logToFile(`🚨 [MCP] Server startup error: ${error.message}`);
  console.error("🚨 [MCP] Server startup error:", error);
  process.exit(1);
});
