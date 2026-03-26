const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/projects.json');

const BACKUP_PROJECTS = [
    {
        "project_id": "PROJ-DUMMY-01",
        "project_title": "AI Sign Language Recognizer",
        "domain": "AI",
        "problem_statement": "Bridging communication gaps for the hearing impaired using real-time computer vision.",
        "algorithms_used": ["CNN", "MediaPipe"],
        "technologies_used": ["Python", "TensorFlow", "OpenCV"],
        "year": 2024,
        "innovation_score": 88,
        "status": "approved"
    }
];

const readData = () => {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            const dir = path.dirname(DATA_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DATA_PATH, JSON.stringify(BACKUP_PROJECTS, null, 2));
            return BACKUP_PROJECTS;
        }
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('data/projects.json is not an array');
        return parsed;
    } catch (err) {
        console.error('Data Persistence Error:', err.message);
        return BACKUP_PROJECTS;
    }
};

const Project = {
    find: (query = {}) => {
        const data = readData();
        const filtered = data.filter(p => {
            if (query.domain && query.domain !== 'all' && p.domain !== query.domain) return false;
            if (query.year && query.year !== 'all' && p.year != query.year) return false;
            if (query.status && p.status !== query.status) return false;
            
            if (query.search) {
                const search = query.search.toLowerCase();
                const title = (p.project_title || '').toLowerCase();
                const problem = (p.problem_statement || '').toLowerCase();
                const algos = (p.algorithms_used || []).map(a => String(a).toLowerCase());
                
                return title.includes(search) || problem.includes(search) || algos.some(a => a.includes(search));
            }
            return true;
        });

        return {
            sort: function() { return this; },
            limit: function() { return this; },
            then: function(cb) { cb(filtered); return this; },
            _data: filtered
        };
    },

    countDocuments: () => {
        return readData().length;
    },

    aggregate: (pipeline) => {
        const data = readData();
        if (pipeline.some(p => p.$group?._id === "$domain")) {
            const counts = {};
            data.forEach(p => counts[p.domain] = (counts[p.domain] || 0) + 1);
            return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
        }
        return [];
    },

    save: (projectData) => {
        const data = readData();
        const existingIndex = data.findIndex(p => p._id === projectData._id || p.project_id === projectData.project_id);
        
        if (existingIndex !== -1) {
            data[existingIndex] = { ...data[existingIndex], ...projectData, updatedAt: new Date() };
        } else {
            const newProject = {
                ...projectData,
                _id: Date.now().toString(),
                createdAt: new Date(),
                status: projectData.status || 'pending'
            };
            data.push(newProject);
            projectData = newProject;
        }
        
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        return projectData;
    },

    semanticSearch: (queryText) => {
        const data = readData().filter(p => p.status === 'approved');
        const search = queryText.toLowerCase().split(' ').filter(word => word.length > 2);
        
        return data
            .map(p => {
                let score = 0;
                const title = (p.project_title || '').toLowerCase();
                const problem = (p.problem_statement || '').toLowerCase();
                const tech = (p.technologies_used || []).join(' ').toLowerCase();
                const algos = (p.algorithms_used || []).join(' ').toLowerCase();

                search.forEach(word => {
                    if (title.includes(word)) score += 10;
                    if (problem.includes(word)) score += 5;
                    if (tech.includes(word)) score += 3;
                    if (algos.includes(word)) score += 3;
                });

                // Innovation bonus
                score += (p.innovation_score || 0) / 20;

                return { ...p, score };
            })
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }
};

module.exports = Project;
