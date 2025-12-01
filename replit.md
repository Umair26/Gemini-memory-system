# Gemini Memory System

## Overview
A powerful AI platform built on Google's Gemini models with persistent memory capabilities, cost optimization through caching, and smart model routing. The system provides unlimited persistent memory with 75% cost savings compared to standard implementations.

## Project Architecture

### Core Components
- **server.js**: Express web server providing both a web interface and OpenAI-compatible API endpoints
- **conversation_engine.js**: Main conversation orchestrator with plugin support
- **gemini_memory_system.js**: 3-tier memory system (Hot/Warm/Cold) implementation
- **model_router.js**: Smart routing between Gemini Flash/Pro/Thinking models
- **memory_orchestrator.js**: Manages memory storage and retrieval across tiers
- **gemini_caching.js**: Implements implicit caching for cost optimization

### Plugins
- **cost_tracker.js**: Monitors API usage and estimates costs
- **multimodal.js**: Handles image, audio, and video processing
- **auto_summarizer.js**: Automatic conversation summarization
- **tools.js**: Function calling capabilities
- **rag.js**: Retrieval-augmented generation support
- **sentiment_analyzer.js**: Real-time sentiment analysis

### Frontend Pages
- `/` - Home page with navigation menu
- `/chat.html` - Interactive chat interface
- `/comparison.html` - Live comparison between memory-enabled and standard Gemini
- `/benchmark.html` - Automated benchmark testing
- `/dashboard.html` - Admin dashboard with statistics

## Technology Stack
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **AI Models**: Google Gemini (2.5-flash, 2.0-flash-exp, Pro, Thinking)
- **Vector Store**: ChromaDB for embeddings
- **Memory**: Qdrant for long-term memory storage
- **Language**: JavaScript (ES modules)

## Environment Configuration

### Required Secrets
- `GOOGLE_API_KEY` - Google Gemini API key (configured in Replit Secrets)

### Server Configuration
- **Port**: 5000 (required for Replit)
- **Host**: 0.0.0.0 (required for Replit frontend hosting)
- **Development**: Uses nodemon for auto-reload
- **Production**: Uses node directly with autoscale deployment

## API Endpoints

### OpenAI-Compatible
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completions (LobeChat compatible)

### Direct API
- `POST /api/chat` - Direct chat endpoint
- `POST /api/compare` - Compare memory vs non-memory responses
- `POST /api/benchmark` - Run automated benchmarks
- `GET /api/stats` - Get cost and usage statistics
- `GET /api/health` - Health check
- `GET /api/info` - API information

## Deployment

### Development
The workflow "Gemini Memory System Server" runs `npm run dev` on port 5000 with nodemon for automatic reloading.

### Production
Configured for Replit autoscale deployment:
- Command: `node server.js`
- Auto-scales based on traffic
- Environment variables automatically available

## Features
- ✅ 3-Tier Persistent Memory (Hot/Warm/Cold)
- ✅ Implicit Caching (75% cost savings)
- ✅ Smart Model Routing (Flash/Pro/Thinking)
- ✅ Multimodal Support (Images, Audio, Video)
- ✅ Function Calling & Tools
- ✅ Auto-Summarization
- ✅ OpenAI-Compatible API
- ✅ Cost Tracking & Analytics

## Recent Changes
- **2025-12-01**: Initial Replit setup
  - Configured server to bind to 0.0.0.0:5000 for Replit hosting
  - Set up workflow for development server with webview output
  - Configured autoscale deployment for production
  - Installed dependencies with --legacy-peer-deps to resolve @qdrant/js-client-rest version conflict
  - Added GOOGLE_API_KEY secret for Gemini API access

## Notes
- The system uses ChromaDB for local vector storage and Qdrant for distributed memory
- Dependencies installed with --legacy-peer-deps due to version conflicts in @langchain/community
- Persistent memory data stored in `persistent_memory/` directory (gitignored)
- Game world data can be optionally loaded from `game_world.json`
