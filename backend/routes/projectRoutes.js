const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
const { analyzeAndGenerate } = require('../utils/aiEngine');

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

module.exports = router;
