const Project = require('../backend/models/Project');
const fs = require('fs');
const path = require('path');

const domains = ["AI", "Blockchain", "IoT", "Healthcare", "Cybersecurity", "NLP", "Smart Systems", "Machine Learning"];
const technologies = ["React", "Python", "Node.js", "TensorFlow", "Solidity", "Raspberry Pi", "AWS", "Google Cloud", "PyTorch", "Rust"];
const algorithms = ["CNN", "RNN", "Zk-SNARKs", "Random Forest", "K-Means", "Dijkstra", "AES-256", "Transformer", "BERT", "GPT-3"];

const seedData = async () => {
    try {
        console.log('Seeding data to JSON storage...');

        const projects = [];
        for (let i = 1; i <= 50; i++) {
            const domain = domains[Math.floor(Math.random() * domains.length)];
            projects.push({
                project_id: `PROJ-${1000 + i}`,
                project_title: `${domain} based ${i} Project`,
                domain: domain,
                problem_statement: `This project addresses the challenges in ${domain} sector specifically focusing on efficiency and security.`,
                algorithms_used: [algorithms[Math.floor(Math.random() * algorithms.length)]],
                technologies_used: [technologies[Math.floor(Math.random() * technologies.length)], "NextGen Tech"],
                limitations: "Existing solutions are slow and lack real-time analysis.",
                year: 2020 + Math.floor(Math.random() * 5),
                innovation_score: 60 + Math.floor(Math.random() * 30),
                future_scope: "Expansion into cloud-native environments.",
                research_gap: "Limited datasets and high latency in current models.",
                scalability_factor: "High - can be scaled horizontally.",
                dataset_reference_link: "https://ieee-dataport.org/",
                ai_confidence: parseFloat((85 + (Math.random() * 10)).toFixed(1))
            });
        }

        const realisticProjects = [
            {
                project_id: "PROJ-REAL-1",
                project_title: "Decentralized Healthcare Record Management",
                domain: "Blockchain",
                problem_statement: "Protecting patient records from centralized hacks and unauthorized access.",
                algorithms_used: ["SHA-256", "Zero Knowledge Proofs"],
                technologies_used: ["Ethereum", "IPFS", "React"],
                limitations: "High gas fees and slow transaction throughput on Ethereum mainnet.",
                year: 2023,
                innovation_score: 88,
                research_gap: "Privacy-preserving retrieval of records without revealing patient identity.",
                scalability_factor: "Layer 2 solutions required for global scale.",
                ai_confidence: 92.5
            },
            {
                project_id: "PROJ-REAL-2",
                project_title: "Predictive Maintenance for Industrial IoT",
                domain: "IoT",
                problem_statement: "Unexpected machinery failure causing millions in losses for manufacturing units.",
                algorithms_used: ["LSTMs", "Isolation Forest"],
                technologies_used: ["MQTT", "InfluxDB", "Grafana"],
                limitations: "Requires high-frequency sensor data which peaks bandwidth usage.",
                year: 2024,
                innovation_score: 82,
                research_gap: "Edge-only processing to reduce cloud dependency and latency.",
                scalability_factor: "Easily deployable across multiple factory sites.",
                ai_confidence: 89.1
            }
        ];

        await Project.insertMany([...projects, ...realisticProjects]);
        console.log('52 Projects seeded successfully to JSON file!');
    } catch (err) {
        console.error('Error seeding database:', err);
    }
};

seedData();
