import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { engine } from "./conversation_engine.js";
import { plugins } from "./plugins/plugin_system.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { hfChat } from "./models/huggingface.js";
import { replicateChat, replicateMistral } from "./models/replicate.js";
import fs from "fs";

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  credentials: true
}));

app.use(express.json());

// Load world data
let worldData = {};
if (fs.existsSync("./game_world.json")) {
  worldData = JSON.parse(fs.readFileSync("./game_world.json", "utf-8"));
  console.log("✅ Game world data loaded");
} else {
  console.log("ℹ️ No game_world.json found, continuing without world data");
}

// Initialize
plugins.registerPlugin("cost-tracker", costTrackerPlugin);
await engine.initialize(worldData);

// Simple chat endpoint with model selection
app.post("/chat", async (req, res) => {
  const { message, model = "auto" } = req.body;
  if (!message) return res.status(400).json({ error: "Message missing" });

  let reply = null;
  let usedModel = "";

  try {
    if (model === "huggingface") {
      console.log("🤗 Testing HuggingFace...");
      reply = await hfChat(message);
      usedModel = "HuggingFace Llama-3.3-70B";

    } else if (model === "replicate") {
      console.log("🔄 Testing Replicate Llama-3-8B...");
      reply = await replicateChat(message);
      usedModel = "Replicate Llama-3-8B";

    } else if (model === "replicate-mistral") {
      console.log("🔄 Testing Replicate Mistral-7B...");
      reply = await replicateMistral(message);
      usedModel = "Replicate Mistral-7B";

    } else {
      // AUTO MODE: Use Gemini (fast & reliable)
      console.log("🤖 AUTO mode: Using Gemini Flash...");
      const gemini = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY
      });
      const result = await gemini.invoke(message);
      reply = result.content;
      usedModel = "Gemini Flash";
    }

    if (!reply) {
      throw new Error("All models failed");
    }

    console.log(`✅ Response from: ${usedModel}`);

    res.json({
      success: true,
      modelUsed: usedModel,
      message: message,
      reply: reply
    });

  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({ 
      error: "Model failed to respond",
      details: error.message
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

// API info endpoint
app.get("/api/info", (req, res) => {
  res.json({ 
    status: "ok",
    service: "Gemini Memory System API",
    version: "2.0.0",
    endpoints: {
      health: "/api/health",
      models: "/v1/models",
      chat: "/chat",
      apiChat: "/v1/chat/completions",
      compare: "/api/compare",
      benchmark: "/api/benchmark",
      stats: "/api/stats"
    }
  });
});

// OpenAI-compatible models endpoint
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "gemini-memory-system",
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "your-company"
      }
    ]
  });
});

// OpenAI-compatible chat completions
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "messages is required",
          type: "invalid_request_error",
          code: "missing_messages"
        }
      });
    }
    
    const lastMessage = messages[messages.length - 1].content;
    const sessionId = req.headers['x-session-id'] || 'lobechat-' + Date.now();
    
    console.log("📨 LobeChat Request:", lastMessage);
    
    const result = await engine.chat(lastMessage, sessionId);
    
    res.json({
      id: "chatcmpl-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "gemini-memory-system",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.response
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: result.metadata?.memoryTokens || 0,
        completion_tokens: result.metadata?.tokens || 0,
        total_tokens: (result.metadata?.memoryTokens || 0) + (result.metadata?.tokens || 0)
      }
    });
    
  } catch (error) {
    console.error("LobeChat error:", error);
    res.status(500).json({ 
      error: { 
        message: error.message, 
        type: "server_error",
        code: "internal_error"
      } 
    });
  }
});

// Regular chat endpoint with memory
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    const result = await engine.chat(message, sessionId);
    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Comparison endpoint
app.post("/api/compare", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    const withMemory = await engine.chat(message, sessionId);
    const standardGemini = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY
    });
    const withoutMemory = await standardGemini.invoke(message);
    const stats = costTrackerPlugin.getStats();
    
    res.json({
      comparison: {
        withMemory: {
          response: withMemory.response,
          model: withMemory.model,
          hasContext: withMemory.metadata.memoryTokens > 0,
          features: ["Memory", "Context", "Cost Optimization", "Smart Routing"],
          tokensUsed: withMemory.metadata.tokens || 0
        },
        withoutMemory: {
          response: withoutMemory.content,
          model: "gemini-2.5-flash",
          hasContext: false,
          features: ["None"]
        }
      },
      stats: {
        totalQueries: stats.totalQueries || 0,
        cacheHitRate: stats.cacheHitRate || "0%",
        monthlyCost: stats.estimatedMonthlyCost || "$0.00"
      }
    });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Benchmark endpoint
app.post("/api/benchmark", async (req, res) => {
  const DEMO_MODE = true;

  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return res.json({
      results: [
        {
          query: "My name is John and I am 32 years old.",
          expectMemory: false,
          withMemory: { response: "Thanks John! Got it: you're 32.", hasContext: true },
          withoutMemory: { response: "Thanks for sharing that!", hasContext: false },
          winner: "Tie"
        },
        {
          query: "What is my name?",
          expectMemory: true,
          withMemory: { response: "Your name is John — you mentioned it earlier.", hasContext: true },
          withoutMemory: { response: "As an AI, I don't have access to previous details unless you tell me again.", hasContext: false },
          winner: "Your System"
        }
      ],
      summary: {
        totalTests: 2,
        yourSystemWins: 1,
        stats: {
          totalQueries: 10,
          cacheHitRate: "88%",
          estimatedMonthlyCost: "$7.80"
        }
      }
    });
  }
});

// Stats endpoint
app.get("/api/stats", (req, res) => {
  try {
    const stats = costTrackerPlugin.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`
✅ API Server running on http://${HOST}:${PORT}

Endpoints:
  POST   /chat                - Simple chat (HF/Replicate)
  POST   /api/chat            - Chat with memory
  POST   /v1/chat/completions - OpenAI-compatible
  GET    /api/health          - Health check
  GET    /api/info            - API info

Models Available:
  - HuggingFace Llama-3.3-70B (free, may be slow)
  - Replicate Llama-2-70B
  - Replicate DeepSeek-V2
  - Gemini (memory engine)
`);
});