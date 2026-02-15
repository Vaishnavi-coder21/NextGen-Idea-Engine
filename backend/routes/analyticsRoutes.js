const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

router.get('/', async (req, res) => {
    try {
        const totalProjects = await Project.countDocuments();

        const domainData = await Project.aggregate([
            { $group: { _id: "$domain", count: { $sum: 1 } } }
        ]);

        const innovationTrend = await Project.aggregate([
            { $group: { _id: "$year", avgScore: { $sum: "$innovation_score" } } },
            { $sort: { _id: 1 } }
        ]);

        const algoUsage = await Project.aggregate([
            { $unwind: "$algorithms_used" },
            { $group: { _id: "$algorithms_used", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            totalProjects,
            domainDistribution: domainData,
            innovationTrend,
            algorithmUsage: algoUsage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
