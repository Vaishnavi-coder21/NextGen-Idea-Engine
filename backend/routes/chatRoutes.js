const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const axios = require('axios');
const Project = require('../models/Project');
const agentManager = require('../utils/agentManager');

// Initialize OpenAI client if key is provided
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Initialize Gemini client if key is provided
let geminiModel = null;
try {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        console.log('✅ Gemini AI initialized successfully');
    }
} catch (e) {
    console.warn('⚠️ Gemini AI not available:', e.message);
}

async function performWebSearch(query) {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey === 'your_serper_api_key_here') {
        return `MOCK RESEARCH DATA for "${query}":
        1. [Latest Research] Adaptive Transformer architectures are reducing latency in sign-language models by 40% (Nature AI, 2024).
        2. [Tech Trend] Distributed Edge AI is now preferred over centralized cloud processing for real-time innovation matching.
        3. [Market Gap] There is a significant lack of open-source datasets for niche technical domains like Zk-SNARK implementation in healthcare.`;
    }

    try {
        console.log(`🌐 Performing live web search for: ${query}`);
        const response = await axios.post('https://google.serper.dev/search',
            { q: query, num: 3 },
            { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
        );
        return response.data.organic.map(r => `- ${r.title}: ${r.snippet}`).join('\n');
    } catch (error) {
        console.error('Web Search Error:', error.message);
        return "I attempted a web search but encountered a connection issue. Falling back to local innovation knowledge.";
    }
}

router.post('/', async (req, res) => {
    try {
        const { message, webSearch } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        let provider = process.env.AI_PROVIDER || 'groq';
        let responseText = "";
        let currentProvider = provider;
        let searchContext = "";
        if (webSearch) searchContext = await performWebSearch(message);

        const projects = await Project.semanticSearch(message);
        const context = projects;
        const projectSummary = projects.map(p => `- ${p.project_title}: ${p.problem_statement}`).join('\n');
        
        const systemPrompt = `You are an advanced AI system called "NextGen Idea Engine", integrated into a professional research gap detection platform.
Your role is a combination of Intelligent chatbot, Innovative idea generator, Startup advisor, Technical guide, and Idea evaluator.

PROJECT ARCHITECTURE & FEATURES MAP:
- Name: NextGen IdeaEngine
- Purpose: A platform to detect research gaps and suggest next-generation innovations.
- Frontend: Professional Lucid-dark theme using HTML5, CSS3, and Vanilla JavaScript.
- Backend: Robust Node.js with Express.js server.
- AI Logic: Multi-provider engine (Groq Llama-3.3-70b, Gemini, OpenAI) with a local Semantic Search RAG.
- Key Sections:
  1. "Generate AI Idea" (#generate): Analyzes input and provides a technical innovation blueprint.
  2. "Project Repository" (#repository): A list of existing research projects with filters and Semantic/Keyword search options.
  3. "AI Insights" (#analytics-tab): A dashboard with Chart.js visualizations showing Domain Distribution, Algorithm Usage, and Trends.
  4. "AI Assistant" (#chatbot-tab): This current chat interface for real-time innovation advice.
  5. "Peer Review": A system where Students upload projects, and Teachers/Admins review/approve them.

CORE OBJECTIVES:
1. Generate unique, creative, and practical ideas (Avoid generic ones).
2. Provide structured, high-quality responses (headings + bullet points).
3. Base your knowledge on the PROJECT architecture and the RELEVANT REPOSITORY CONTEXT provided below.

RELEVANT REPOSITORY CONTEXT (Local Projects):
${projectSummary}

IDEA GENERATION PIPELINE:
- Step 1: Understand domain.
- Step 2: Generate 3–5 innovative ideas.
- Step 3: Provide Title, Problem, Solution, Tech Stack, and Innovation factor for the best idea.

If the user asks about the application's structure or "where is what", refer to the PROJECT ARCHITECTURE MAP above.`;

        const providersToTry = [provider, 'groq', 'gemini', 'openai', 'huggingface'];
        let success = false;

        for (const p of [...new Set(providersToTry)]) {
            try {
                console.log(`🤖 Attempting AI provider: ${p}...`);
                if (p === 'groq' && process.env.GROQ_API_KEY) {
                    const groqRes = await axios.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        {
                            model: "llama-3.3-70b-versatile",
                            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                            temperature: 0.7
                        },
                        { 
                            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
                            timeout: 10000 // 10 second timeout for Groq
                        }
                    );
                    responseText = groqRes.data.choices[0].message.content;
                    success = true;
                    currentProvider = 'groq';
                    console.log(`✅ Groq Success`);
                } else if (p === 'gemini' && geminiModel) {
                    const result = await geminiModel.generateContent(systemPrompt + "\n\nUser: " + message);
                    responseText = result.response.text();
                    success = true;
                    currentProvider = 'gemini';
                    console.log(`✅ Gemini Success`);
                } else if (p === 'openai' && openai) {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                        max_tokens: 800
                    });
                    responseText = completion.choices[0].message.content;
                    success = true;
                    currentProvider = 'openai';
                    console.log(`✅ OpenAI Success`);
                }

                if (success) break;
            } catch (err) {
                const status = err.response?.status || err.status;
                const msg = err.response?.data?.error?.message || err.message;
                console.warn(`⚠️ ${p} failed (${status}): ${msg}`);
                
                if (status === 429 || msg?.includes('429')) {
                    continue; // Try next one
                }
                // For other errors, we still try to fall back if possible
                continue;
            }
        }

        if (!success) {
            console.warn('⚠️ All AI Providers failed or exceeded quota. Using Smart Demo Mode.');
            const matchedProject = context[0]; // RAG found the best match
            
            if (matchedProject && (
                message.toLowerCase().includes(matchedProject.project_title.toLowerCase().split(' ')[0]) ||
                message.toLowerCase().includes(matchedProject.domain.toLowerCase())
            )) {
                responseText = `🤖 [SMART DEMO MODE]: I've retrieved specific details about **${matchedProject.project_title}** for you:

**Technical Overview**:
- **Domain**: ${matchedProject.domain}
- **Innovation Score**: ${matchedProject.innovation_score}%
- **Core Algorithms**: ${(matchedProject.algorithms_used || []).join(', ') || 'Neural Networks'}
- **Tech Stack**: ${(matchedProject.technologies_used || []).join(', ') || 'Python, Node.js'}

**Problem Addressed**:
${matchedProject.problem_statement}

**Research Gap identified**:
${matchedProject.research_gap || "Highly innovative area with significant scalability potential."}

*Note: AI Brain is in Power-Saving mode (API limit). To enable real-time brainstorming, please contact the administrator.*`;
            } else {
                responseText = `🤖 [DEMO MODE]: My AI providers (Groq/Gemini/OpenAI) are currently at their limit. 

However, I've scanned our repository of **${context.length} projects**. Here are some trending domains you can explore: 
**${[...new Set(context.map(p => p.domain))].slice(0, 4).join(', ')}**.

*Please check your .env file to restore full AI capabilities!*`;
            }
            currentProvider = 'mock';
        }

        res.json({ response: responseText, searched: !!webSearch, provider: currentProvider });
    } catch (error) {
        console.error('Chat error:', error.message);
        const fallbackMsg = "I'm currently optimizing my neural pathways. Please try again in a moment, or check your API configuration!";
        res.status(500).json({ error: 'AI Brain Error', details: error.message, fallback: fallbackMsg });
    }
});

module.exports = router;
