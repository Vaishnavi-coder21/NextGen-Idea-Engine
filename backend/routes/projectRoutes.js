const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const aiEngine = require('../utils/aiEngine');

// GET all projects with filtering
router.get('/', async (req, res) => {
    try {
        const { domain, year, search } = req.query;
        let query = {};

        if (domain) query.domain = domain;
        if (year) query.year = year;
        if (search) {
            query.search = search;
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET search suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const projects = await Project.find({ search: q });
        const suggestions = projects.slice(0, 5).map(p => ({
            id: p._id,
            title: p.project_title,
            domain: p.domain
        }));
        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST generate-idea
router.post('/generate-idea', async (req, res) => {
    try {
        const { project_title, problem_statement } = req.body;

        // Fetch existing projects for comparison
        const existingProjects = await Project.find();

        // Use AI engine to analyze and generate
        const innovation = await aiEngine.analyzeAndGenerate(project_title, problem_statement, existingProjects);

        res.status(200).json(innovation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add-project (Admin)
router.post('/', async (req, res) => {
    const project = new Project(req.body);
    try {
        const newProject = await project.save();
        res.status(201).json(newProject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE project (Admin)
router.delete('/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
