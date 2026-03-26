const axios = require('axios');
const Project = require('../models/Project');

class AgentManager {
    constructor() {
        this.systemMessage = `You are the NextGen IdeaEngine Expert Agent.
You have access to the following tools to help researchers:
1. searchRepository(query): Finds existing projects in the local repository.
2. getAnalytics(): Returns global statistics about project domains and counts.
3. searchWeb(query): Conducts a live search for cutting-edge technical data.

When asked a question:
1. THOUGHT: Decide which tool to use.
2. ACTION: Call the tool.
3. OBSERVATION: Process the result.
4. FINAL ANSWER: Synthesize everything for the user.`;
    }

    async executeTool(toolName, args) {
        console.log(`🛠️ Agent executing tool: ${toolName} with args:`, args);
        try {
            switch (toolName) {
                case 'searchRepository':
                    const results = await Project.semanticSearch(args.query || args);
                    return JSON.stringify(results.map(p => ({
                        title: p.project_title,
                        domain: p.domain,
                        innovation: p.innovation_score,
                        problem: p.problem_statement
                    })));
                
                case 'getAnalytics':
                    const domains = await Project.aggregate([{ $group: { _id: "$domain" } }]);
                    return JSON.stringify({
                        total: await Project.countDocuments(),
                        domains: domains
                    });

                case 'searchWeb':
                    const serperKey = process.env.SERPER_API_KEY;
                    if (!serperKey || serperKey === 'your_serper_api_key_here') return "Web search disabled (API key missing).";
                    const webRes = await axios.post('https://google.serper.dev/search', 
                        { q: args.query || args, num: 3 },
                        { headers: { 'X-API-KEY': serperKey } }
                    );
                    return JSON.stringify(webRes.data.organic.map(r => r.snippet));

                default:
                    return "Unknown tool.";
            }
        } catch (err) {
            return `Tool Error: ${err.message}`;
        }
    }

    async processQuery(message, provider = 'gemini') {
        // Initial Retrieval (RAG)
        const initialContext = await Project.semanticSearch(message);
        const contextStr = initialContext.map(p => `[Project: ${p.project_title}]`).join(', ');

        // For now, we use a single-pass "Agentic Prompt" to keep it fast and avoid 429 loops
        // In a full implementation, this would be a multi-step ReAct loop.
        const prompt = `
            ${this.systemMessage}
            
            Current Repository Context (Relevant to query):
            ${contextStr}

            User Query: "${message}"

            If the context is enough, provide the final answer. 
            If you need more data (like global stats), specify the tool you would use and I will mock the result for now.
        `;

        // We delegate the actual LLM call back to the route for API key handling
        return { prompt, context: initialContext };
    }
}

module.exports = new AgentManager();
