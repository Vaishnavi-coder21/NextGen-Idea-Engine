const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/projects.json');

// Essential Fallback Dataset to guarantee visibility on Vercel
const BACKUP_PROJECTS = [
    {
        "project_id": "PROJ-MANUAL-01",
        "project_title": "Sign Language Recognizer",
        "domain": "AI",
        "problem_statement": "Convert sign language to text",
        "algorithms_used": ["CNN", "MediaPipe"],
        "technologies_used": ["Python", "TensorFlow"],
        "limitations": "Lighting conditions",
        "year": 2024,
        "innovation_score": 85,
        "research_gap": "Dynamic gesture tracking in low light."
    },
    {
        "project_id": "PROJ-MANUAL-02",
        "project_title": "Disease Prediction using ML",
        "domain": "Healthcare",
        "problem_statement": "Early detection of chronic diseases",
        "algorithms_used": ["Random Forest", "XGBoost"],
        "technologies_used": ["Python", "Sklearn"],
        "limitations": "Data privacy",
        "year": 2025,
        "innovation_score": 92,
        "research_gap": "Integration of real-time wearable data."
    },
    {
        "project_id": "PROJ-MANUAL-50",
        "project_title": "Handwriting-Based Gender Prediction",
        "domain": "AI",
        "problem_statement": "Predict gender from handwriting",
        "algorithms_used": ["CNN"],
        "technologies_used": ["Python"],
        "limitations": "Dataset scale",
        "year": 2025,
        "innovation_score": 90,
        "research_gap": "Cross-cultural variations in stroke patterns."
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
                const domainMatch = p.domain && p.domain.toLowerCase().includes(s);
                if (!titleMatch && !probMatch && !algoMatch && !techMatch && !domainMatch) match = false;
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
            then(resolve, reject) {
                resolve(this._data);
            }
        };
        return queryObj;
    },
    countDocuments: async () => {
        return readData().length;
    },
    aggregate: async (pipeline) => {
        let result = readData();
        for (const stage of pipeline) {
            if (stage.$unwind) {
                const field = stage.$unwind.replace('$', '');
                let unwound = [];
                result.forEach(item => {
                    if (Array.isArray(item[field])) {
                        item[field].forEach(val => {
                            unwound.push({ ...item, [field]: val });
                        });
                    } else if (item[field]) {
                        unwound.push({ ...item, [field]: item[field] });
                    }
                });
                result = unwound;
            } else if (stage.$group) {
                const groupField = stage.$group._id.replace('$', '');
                const groups = {};
                result.forEach(item => {
                    const key = item[groupField] || 'Unknown';
                    if (!groups[key]) {
                        groups[key] = { _id: key, count: 0, totalScore: 0 };
                    }
                    groups[key].count++;
                    if (stage.$group.avgScore && stage.$group.avgScore.$sum) {
                        const scoreField = stage.$group.avgScore.$sum.replace('$', '');
                        groups[key].totalScore += (item[scoreField] || 0);
                    }
                });
                result = Object.values(groups).map(g => {
                    const obj = { _id: g._id, count: g.count };
                    if (stage.$group.avgScore) {
                        obj.avgScore = Math.round(g.totalScore / g.count);
                    }
                    return obj;
                });
            } else if (stage.$sort) {
                const sortField = Object.keys(stage.$sort)[0];
                const order = stage.$sort[sortField];
                result.sort((a, b) => {
                    if (a[sortField] < b[sortField]) return order === 1 ? -1 : 1;
                    if (a[sortField] > b[sortField]) return order === 1 ? 1 : -1;
                    return 0;
                });
            } else if (stage.$limit) {
                result = result.slice(0, stage.$limit);
            }
        }
        return result;
    },
    save: async (projectData) => {
        try {
            const data = readData();
            const newProject = { ...projectData, _id: Date.now().toString(), createdAt: new Date() };
            data.push(newProject);
            // On Vercel this will fail, but we don't crash. Local will work.
            fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
            return newProject;
        } catch (err) {
            console.warn('Persistence Error:', err.message);
            // For production simulation, we return the object as if saved in memory
            return { ...projectData, _id: Date.now().toString(), createdAt: new Date() };
        }
    }
};

module.exports = Project;
