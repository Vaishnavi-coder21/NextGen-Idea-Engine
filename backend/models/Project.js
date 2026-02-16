const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/projects.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../../data'))) {
    fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });
}

// Initialize file if not exists
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
}

const Project = {
    find: (query = {}) => {
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        let filtered = data.filter(p => {
            let match = true;
            if (query.domain && p.domain !== query.domain) match = false;
            if (query.year && p.year != query.year) match = false;
            if (query.search) {
                const s = query.search.toLowerCase();
                const titleMatch = p.project_title && p.project_title.toLowerCase().includes(s);
                const probMatch = p.problem_statement && p.problem_statement.toLowerCase().includes(s);
                const algoMatch = p.algorithms_used && p.algorithms_used.some(a => a.toLowerCase().includes(s));
                const techMatch = p.technologies_used && p.technologies_used.some(t => t.toLowerCase().includes(s));
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
            // Makes it "awaitable"
            then(resolve, reject) {
                resolve(this._data);
            }
        };
        return queryObj;
    },
    countDocuments: async () => {
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        return data.length;
    },
    aggregate: async (pipeline) => {
        console.log('Running mock aggregation pipeline:', JSON.stringify(pipeline));
        let result = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        console.log('Initial data count:', result.length);

        for (const stage of pipeline) {
            console.log('Processing stage:', Object.keys(stage)[0]);
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
                console.log('After unwind count:', result.length);
            } else if (stage.$group) {
                const groupField = stage.$group._id.replace('$', '');
                console.log('Grouping by:', groupField);
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
                console.log('After group count:', result.length);
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
        console.log('Final aggregation result count:', result.length);
        return result;
    },
    save: async (projectData) => {
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        const newProject = { ...projectData, _id: Date.now().toString(), createdAt: new Date() };
        data.push(newProject);
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        return newProject;
    },
    insertMany: async (projects) => {
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        const newProjects = projects.map(p => ({ ...p, _id: Date.now().toString() + Math.random(), createdAt: new Date() }));
        data.push(...newProjects);
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        return newProjects;
    },
    findByIdAndDelete: async (id) => {
        const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        const filtered = data.filter(p => p._id !== id);
        fs.writeFileSync(DATA_PATH, JSON.stringify(filtered, null, 2));
    }
};

module.exports = Project;
