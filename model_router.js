import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { hfChat } from "./models/huggingface.js";
import { replicateChat, replicateMistral } from "./models/replicate.js";
import dotenv from "dotenv";

dotenv.config();

class GeminiRouter {
  constructor() {
    // Google Gemini models (kept for analysis)
    this.geminiModels = {
      fast: new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.7,
        maxOutputTokens: 8192,
        apiKey: process.env.GOOGLE_API_KEY
      }),
      pro: new ChatGoogleGenerativeAI({
        model: "gemini-2.5-pro",
        temperature: 0.7,
        maxOutputTokens: 8192,
        apiKey: process.env.GOOGLE_API_KEY
      })
    };
  }

  async analyzeQuery(query) {
    const classifier = this.geminiModels.fast;
    const analysis = await classifier.invoke(`
Analyze this query and return ONLY JSON (no markdown, no backticks):
{
  "complexity": "simple|medium|complex",
  "type": "dialogue|creative|technical|retrieval|reasoning",
  "requiresMemory": true|false,
  "estimatedTokens": number,
  "requiresReasoning": true|false
}

Query: ${query}
    `);

    try {
      const cleaned = analysis.content.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        complexity: "medium",
        type: "dialogue",
        requiresMemory: true,
        estimatedTokens: 500,
        requiresReasoning: false
      };
    }
  }

  async routeQuery(query, context = "") {
    const analysis = await this.analyzeQuery(query);
    
    let modelName;
    let response;
    let provider;

    const fullPrompt = context 
      ? `CONTEXT:\n${context}\n\nUSER QUERY: ${query}` 
      : query;

    // Route based on complexity
    if (analysis.requiresReasoning || analysis.complexity === "complex") {
      
      // Use Replicate DeepSeek for reasoning
      modelName = "Mistral-7B (Replicate)";
      console.log(`🧠 Routing to: ${modelName} (deep reasoning)`);
      provider = "Replicate";
      response = await replicateMistral(fullPrompt);

      // Fallback to HuggingFace if Replicate fails
      if (!response) {
        console.log("⚠️ Replicate failed, trying HuggingFace...");
        modelName = "Llama-3.3-70B (HuggingFace)";
        provider = "HuggingFace";
        response = await hfChat(fullPrompt);
      }

    } else if (analysis.type === "technical" || analysis.complexity === "medium") {
      
      // Use HuggingFace for technical/medium queries
      modelName = "Llama-3.3-70B (HuggingFace)";
      console.log(`💻 Routing to: ${modelName}`);
      provider = "HuggingFace";
      response = await hfChat(fullPrompt);

      // Fallback to Replicate if HF fails
      if (!response) {
        console.log("⚠️ HuggingFace failed, trying Replicate...");
        modelName = "Llama-2-70B (Replicate)";
        provider = "Replicate";
        response = await replicateChat(fullPrompt);
      }

    } else {
      
      // Use Gemini Flash for simple queries
      modelName = "Gemini Flash";
      console.log(`📱 Routing to: ${modelName} (fastest)`);
      provider = "Google Gemini";
      const result = await this.geminiModels.fast.invoke(fullPrompt);
      response = result.content;
    }

    // Final fallback to Gemini if everything fails
    if (!response) {
      console.log("⚠️ All external models failed, using Gemini Pro...");
      modelName = "Gemini Pro (Fallback)";
      provider = "Google Gemini";
      const result = await this.geminiModels.pro.invoke(fullPrompt);
      response = result.content;
    }

    return {
      response,
      model: modelName,
      analysis,
      provider
    };
  }
}

const router = new GeminiRouter();
export { GeminiRouter, router };