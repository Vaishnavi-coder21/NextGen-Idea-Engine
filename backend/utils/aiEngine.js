const OpenAI = require('openai');
const axios = require('axios');

// Initialize OpenAI client if key is provided
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
    : null;

const analyzeAndGenerate = async (title, problem, existingProjects) => {
    const provider = process.env.AI_PROVIDER || 'openai';
    const prompt = `
        As an expert AI research assistant, analyze the following student project proposal:
        Title: ${title}
        Problem Statement: ${problem}

        Provide a JSON response with the following fields:
        - enhanced_title: A more professional, research-oriented title.
        - improved_problem_statement: A refined, more technical problem statement.
        - suggested_algorithms: List of 2-3 modern, advanced algorithms suitable for this project.
        - suggested_technologies: List of 3-4 modern technologies/frameworks to use.
        - research_gap: A brief explanation of the research gap this project addresses.
        - innovation_score: An integer from 0-100 representing how innovative this is.
        - ai_confidence: A float representing your confidence in this analysis.
        - future_scope: Potential future directions for this research.
        - scalability_suggestion: How to make this project scalable.
    `;

    try {
        let result;
        if (provider === 'openai' && openai) {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });
            result = JSON.parse(completion.choices[0].message.content);
        } else if (provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) {
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
                { inputs: prompt },
                { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
            );
            // Simplistic extraction for HF as it usually returns text
            const text = response.data[0].generated_text;
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            result = JSON.parse(text.substring(jsonStart, jsonEnd));
        } else {
            // Fallback to mock if no API keys are set
            console.warn('AI API not configured, using mock analysis');
            return {
                enhanced_title: `NextGen: ${title}`,
                improved_problem_statement: problem,
                suggested_algorithms: ["Inference Engines", "Neural Networks"],
                suggested_technologies: ["React", "Node.js", "Python"],
                research_gap: "Needs further API configuration to analyze deep research gaps.",
                innovation_score: 75,
                ai_confidence: 80,
                future_scope: "Integration with cloud services.",
                scalability_suggestion: "Containerization with Docker."
            };
        }
        return result;
    } catch (error) {
        console.error('AI Analysis Error:', error.message);
        throw error;
    }
};

module.exports = { analyzeAndGenerate };
