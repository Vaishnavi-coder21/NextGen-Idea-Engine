const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/projects.json');

// Essential Fallback Dataset
const BACKUP_PROJECTS = [
    {
        "project_id": "PROJ-MANUAL-01",
        "project_title": "Sign Language Recognizer",
        "domain": "AI",
        "problem_statement": "Convert sign language to text using computer vision",
        "algorithms_used": ["CNN", "MediaPipe"],
        "technologies_used": ["Python", "TensorFlow"],
        "year": 2024,
        "innovation_score": 85,
        "embedding": [0.12, 0.45, -0.67] // Simplified mock embeddings
    },
    {
        "project_id": "PROJ-MANUAL-02",
        "project_title": "Disease Prediction using ML",
        "domain": "Healthcare",
        "problem_statement": "Early detection of chronic diseases via patient vitals",
        "algorithms_used": ["Random Forest", "XGBoost"],
        "technologies_used": ["Python", "Sklearn"],
        "year": 2025,
        "innovation_score": 92,
        "embedding": [0.33, -0.11, 0.88]
    }
];

const readData = () => {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const raw = fs.readFileSync(DATA_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            return parsed.length > 0 ? parsed : BACKUP_PROJECTS;
        }
    } catch (err) {
        console.error('Project Data Load Error:', err.message);
    }
    return BACKUP_PROJECTS;
};

// Simple Cosine Similarity
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB) return 0;
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * (vecB[i] || 0), 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
};

const Project = {
    find: (query = {}) => {
        const data = readData();
        let filtered = data.filter(p => {
            let match = true;
            if (query.domain && p.domain !== query.domain) match = false;
            if (query.year && p.year != query.year) match = false;
            if (query.search) {
                const s = query.search.toLowerCase();
                const titleMatch = p.project_title && p.project_title.toLowerCase().includes(s);
                const probMatch = p.problem_statement && p.problem_statement.toLowerCase().includes(s);
                const algoMatch = p.algorithms_used && Array.isArray(p.algorithms_used) && p.algorithms_used.some(a => a.toLowerCase().includes(s));
                const techMatch = p.technologies_used && Array.isArray(p.technologies_used) && p.technologies_used.some(t => t.toLowerCase().includes(s));
                if (!titleMatch && !probMatch && !algoMatch && !techMatch) match = false;
            }
            return match;
        });

        const queryObj = {
            _data: filtered,
            sort(sortObj) {
                const field = Object.keys(sortObj)[0];
                const order = sortObj[field];
                this._data.sort((a, b) => {
                    const valA = a[field] || 0;
                    const valB = b[field] || 0;
                    if (valA < valB) return order === 1 ? -1 : 1;
                    if (valA > valB) return order === 1 ? 1 : -1;
                    return 0;
                });
                return this;
            },
            limit(num) {
                this._data = this._data.slice(0, num);
                return this;
            },
            then(resolve) { resolve(this._data); }
        };
        return queryObj;
    },

    semanticSearch: async (queryText) => {
        const data = readData();
        // Since initializing a real transformer model takes time and memory,
        // we use a keyword-overlap-based similarity for the fast prototype,
        // which simulates semantic understanding.
        const queryTerms = queryText.toLowerCase().split(' ');

        const results = data.map(p => {
            let score = 0;
            const content = `${p.project_title} ${p.problem_statement} ${p.domain} ${p.algorithms_used?.join(' ')}`.toLowerCase();
            queryTerms.forEach(term => {
                if (content.includes(term)) score += 1;
            });
            return { ...p, semanticScore: score };
        });

        return results
            .filter(r => r.semanticScore > 0)
            .sort((a, b) => b.semanticScore - a.semanticScore || b.innovation_score - a.innovation_score)
            .slice(0, 5);
    },

    save: async (projectData) => {
        try {
            const data = readData();
            const newProject = {
                ...projectData,
                _id: Date.now().toString(),
                createdAt: new Date(),
                embedding: [Math.random(), Math.random(), Math.random()] // Simulated embedding
            };
            data.push(newProject);
            fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
            return newProject;
        } catch (err) {
            console.warn('Persistence Error:', err.message);
            return { ...projectData, _id: Date.now().toString(), createdAt: new Date() };
        }
    }
};

module.exports = Project;
