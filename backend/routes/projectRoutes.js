const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
const { analyzeAndGenerate } = require('../utils/aiEngine');
const OpenAI = require('openai');
const axios = require('axios');

const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

let geminiModel = null;
try {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    }
} catch (e) {}

// Public: Get all approved projects
router.get('/', async (req, res) => {
    try {
        const { search, domain, year } = req.query;
        const query = { status: 'approved' }; // Only show approved or default projects
        if (domain && domain !== 'all') query.domain = domain;
        if (year && year !== 'all') query.year = year;
        if (search) query.search = search;

        const projects = await Project.find(query).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Protected: Get all pending projects (Teacher/Admin)
router.get('/pending', auth(['teacher', 'admin']), async (req, res) => {
    try {
        const projects = await Project.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Protected: Semantic Search (Student, Teacher, Admin)
router.get('/semantic-search', auth(['student', 'teacher', 'admin']), async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ message: 'Query parameter is required' });

        const results = await Project.semanticSearch(query);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Student Only: Upload Project
router.post('/upload', auth(['student']), async (req, res) => {
    try {
        const { project_title, problem_statement, domain, algorithms_used, technologies_used, year } = req.body;

        // Automated AI Analysis
        const aiAnalysis = await analyzeAndGenerate(project_title, problem_statement, []);

        const projectData = {
            project_title,
            problem_statement,
            domain,
            algorithms_used: Array.isArray(algorithms_used) ? algorithms_used : [algorithms_used],
            technologies_used: Array.isArray(technologies_used) ? technologies_used : [technologies_used],
            year,
            owner: req.user.email,
            status: 'pending', // Pending teacher approval
            innovation_score: aiAnalysis.innovation_score,
            research_gap: aiAnalysis.research_gap,
            ai_suggestions: aiAnalysis
        };

        const newProject = await Project.save(projectData);
        res.status(201).json({ message: 'Project uploaded for review', project: newProject });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Teacher Only: Approve/Comment
router.patch('/:id/review', auth(['teacher', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, teacher_comment } = req.body;

        const allProjects = await Project.find({});
        const project = allProjects.find(p => String(p._id) === id);

        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.status = status;
        project.teacher_comment = teacher_comment;
        project.reviewedAt = new Date().toISOString();

        // Persist to JSON file via Model save logic or direct write
        await Project.save(project); // The Model's save logic handles the file write

        res.json({ message: `Project ${status} successfully`, project });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Only: Delete Project
router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        // Mock delete
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Agentic RAG Idea Generator
router.post('/generate-idea', auth(['student', 'teacher', 'admin']), async (req, res) => {
    try {
        const { input } = req.body;
        if (!input) return res.status(400).json({ message: 'Input is required' });

        const projects = await Project.semanticSearch(input);
        const projectSummary = projects.map(p => `- ${p.project_title}: ${p.problem_statement}`).join('\n');

        const systemPrompt = `You are the strict JSON NextGen IdeaEngine Agent. 
Generate a highly innovative project blueprint based on the user's input.
Use the following context of 'Work Already Done' in our repository to accurately assess limitations and gaps:
${projectSummary}

User Input: ${input}

You MUST return ONLY a raw JSON object with this EXACT structure (No markdown format, no \`\`\`json):
{
  "title": "Creative/Professional Project Title",
  "problem": "Clear problem statement",
  "solution": "Your innovative solution",
  "tech_stack": ["Tech 1", "Tech 2", "Tech 3"],
  "algorithms": ["Algo 1", "Algo 2"],
  "work_already_done": "Brief 1-2 sentence summary of existing projects from the context provided. If none, say so.",
  "limitations": "What are the limitations or research gaps of current approaches?",
  "innovation_score": 95
}`;

        let provider = process.env.AI_PROVIDER || 'groq';
        const providersToTry = [provider, 'groq', 'gemini', 'openai'];
        let responseJson = null;

        for (const p of [...new Set(providersToTry)]) {
            try {
                if (p === 'groq' && process.env.GROQ_API_KEY) {
                    const groqRes = await axios.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        {
                            model: "llama-3.3-70b-versatile",
                            messages: [{ role: "system", content: systemPrompt }],
                            response_format: { type: "json_object" },
                            temperature: 0.7
                        },
                        { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, timeout: 15000 }
                    );
                    responseJson = JSON.parse(groqRes.data.choices[0].message.content);
                } else if (p === 'gemini' && geminiModel) {
                    const result = await geminiModel.generateContent(systemPrompt);
                    let text = result.response.text();
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    responseJson = JSON.parse(text);
                } else if (p === 'openai' && openai) {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: systemPrompt }],
                        response_format: { type: "json_object" }
                    });
                    responseJson = JSON.parse(completion.choices[0].message.content);
                }

                if (responseJson && responseJson.title) break;
            } catch (err) {
                console.warn(`⚠️ Idea Gen ${p} failed:`, err.message);
                continue;
            }
        }

        if (!responseJson) {
            // Mock Fallback
            responseJson = {
                title: "NextGen Dynamic Concept",
                problem: input,
                solution: "Adaptive analytical models using intelligent processing to bypass rate limits.",
                tech_stack: ["Python", "FastAPI", "React", "MongoDB"],
                algorithms: ["Semantic Analysis", "Clustering"],
                work_already_done: `Found ${projects.length} loosely related projects in repository.`,
                limitations: "API Rate limits restricted deeper contextual search.",
                innovation_score: 85
            };
        }

        res.json(responseJson);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
