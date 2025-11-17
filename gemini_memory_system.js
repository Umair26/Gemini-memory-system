import dotenv from "dotenv";
dotenv.config();
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from "chromadb";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8000
});

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxOutputTokens: 8192,
    apiKey: process.env.GOOGLE_API_KEY,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: process.env.GOOGLE_API_KEY,
});

let vectorStore;
try {
  vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: "conversation_memory",
    url: "http://localhost:8000",
  });
  console.log("✅ Connected to existing ChromaDB collection");
} catch (error) {
  console.log("📦 Creating new ChromaDB collection...");
  vectorStore = await Chroma.fromDocuments([], embeddings, {
    collectionName: "conversation_memory",
    url: "http://localhost:8000",
  });
  console.log("✅ ChromaDB collection created");
}

class EnhancedMemory {
    constructor() {
        this.maxTokens = 100000;
        this.currentTokens = 0;
        this.messages = [];
        this.chatHistory = [];
    }

    async saveContext(inputValues, outputValues) {
        this.messages.push(new HumanMessage(inputValues.input));
        this.messages.push(new AIMessage(outputValues.response));
        
        this.chatHistory.push({
            input: inputValues.input,
            output: outputValues.response,
            timestamp: Date.now()
        });
        
        try {
            const conversation = `Human: ${inputValues.input}\nAI: ${outputValues.response}`;
            await vectorStore.addDocuments([
                {
                    pageContent: conversation,
                    metadata: {
                        timestamp: Date.now(),
                        type: "conversation"
                    }
                }
            ]);
        } catch (error) {
            console.log("⚠️ Could not save to vector store:", error.message);
        }

        this.currentTokens += (inputValues.input.length + outputValues.response.length) / 4;
        if (this.currentTokens > 80000) {
            await this.summarizeHistory();
        }
    }

    async loadMemoryVariables() {
        const history = this.chatHistory
            .map(item => `Human: ${item.input}\nAI: ${item.output}`)
            .join('\n\n');
        
        return { history };
    }

    async summarizeHistory() {
        console.log("📝 Summarizing conversation history...");
        const { history } = await this.loadMemoryVariables();
        
        if (!history) {
            console.log("⚠️ No history to summarize");
            return;
        }

        const summary = await model.invoke(
            `Summarize the following conversation:\n\n${history}`
        );

        this.messages = [
            new SystemMessage(`CONVERSATION SUMMARY: ${summary.content}`),
            ...this.messages.slice(-10)
        ];
        
        this.chatHistory = [
            { input: "SUMMARY", output: summary.content, timestamp: Date.now() },
            ...this.chatHistory.slice(-5)
        ];
        
        this.currentTokens = summary.content.length / 4;
        console.log("✅ History summarized");
    }

    async retrieveRelevantContext(query) {
        try {
            const results = await vectorStore.similaritySearch(query, 5);
            if (results && results.length > 0) {
                return results.map(doc => doc.pageContent).join("\n\n");
            }
            return "";
        } catch (error) {
            console.log("⚠️ Could not retrieve context:", error.message);
            return "";
        }
    }

    getMessages() {
        return this.messages;
    }

    async chat(input) {
        console.log("\n💬 User:", input);
        
        const context = await this.retrieveRelevantContext(input);
        const messages = [];
        
        if (context) {
            messages.push(new SystemMessage(`Relevant context:\n${context}`));
        }
        
        messages.push(...this.messages);
        messages.push(new HumanMessage(input));

        const response = await model.invoke(messages);
        
        console.log("🤖 AI:", response.content);
        
        await this.saveContext({ input }, { response: response.content });
        
        return response.content;
    }

    clear() {
        this.messages = [];
        this.chatHistory = [];
        this.currentTokens = 0;
        console.log("🗑️ Memory cleared");
    }
}

const memory = new EnhancedMemory();

export { model, memory, vectorStore, chromaClient };