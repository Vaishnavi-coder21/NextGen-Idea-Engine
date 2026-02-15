const natural = require('natural');
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

const DOMAIN_UPGRADES = {
    "AI": {
        algos: ["Transformer-XL", "Reasoning Models (o1-like)", "Multi-modal LLMs", "Diff-Flow"],
        tech: ["PyTorch Lightning", "Hugging Face Diffusers", "NVIDIA CUDA 12", "Vector Databases (Pinecone)"]
    },
    "Blockchain": {
        algos: ["Zk-SNARKs", "Proof of Useful Work", "Sharding 2.0", "Consensus with VRF"],
        tech: ["Solidity 0.8.20", "Rust", "Hyperledger Fabric", "Polkadot SDK"]
    },
    "IoT": {
        algos: ["Edge Federated Learning", "TinyML Optimization", "MQTT with Quantum Cryptography"],
        tech: ["ESP32-S3", "LoRaWAN v1.1", "Azure IoT Edge", "FreeRTOS"]
    },
    "Healthcare": {
        algos: ["Diffusion for Medical Imaging", "Privacy-Preserving GNNs", "Federated Differential Privacy"],
        tech: ["FHIR API", "DICOM Standard", "TensorFlow Health", "AWS HealthLake"]
    },
    "Cybersecurity": {
        algos: ["Behavioral Adversarial Learning", "Zero-Trust Mesh Networking", "Quantum-Resistant Encryption"],
        tech: ["CrowdStrike APIs", "EBPF Monitoring", "Wazuh", "Snort 3"]
    }
};

const analyzeAndGenerate = async (title, problem, existingProjects) => {
    const tfidf = new TfIdf();

    // Add existing projects to TF-IDF
    existingProjects.forEach(p => {
        tfidf.addDocument(p.project_title + " " + p.problem_statement);
    });

    // Calculate Uniqueness Score based on TF-IDF
    // If few matches, uniqueness is high.
    let matches = 0;
    tfidf.tfidfs(title + " " + problem, (i, measure) => {
        if (measure > 0.5) matches++;
    });

    const uniqueness = Math.max(0, 100 - (matches * 10));
    const algoUpgradeScore = 85; // Simulated for now
    const limitationCoverage = 90; // Simulated for now

    const innovationScore = Math.round((uniqueness + algoUpgradeScore + limitationCoverage) / 3);

    // Mocking "AI" generation based on domain detection
    const tokens = tokenizer.tokenize((title + " " + problem).toLowerCase());
    let detectedDomain = "AI";
    for (const domain in DOMAIN_UPGRADES) {
        if (tokens.includes(domain.toLowerCase())) {
            detectedDomain = domain;
            break;
        }
    }

    const upgrade = DOMAIN_UPGRADES[detectedDomain];

    return {
        enhanced_title: `NextGen: ${title} with ${upgrade.algos[0]}`,
        improved_problem_statement: `While current solutions for ${title} struggle with scalability, this approach leverages ${upgrade.algos[0]} to bridge the performance gap identified in existing research.`,
        suggested_algorithms: [upgrade.algos[0], upgrade.algos[1]],
        suggested_technologies: ["Next.js 14", ...upgrade.tech.slice(0, 2)],
        research_gap: `Lack of high-performance ${upgrade.algos[0]} implementation in traditional ${detectedDomain} workflows.`,
        innovation_score: innovationScore,
        ai_confidence: 94.2,
        future_scope: "Integration with real-time streaming data and autonomous agentic workflows.",
        scalability_suggestion: "Microservices architecture with Kubernetes for dynamic scaling."
    };
};

module.exports = { analyzeAndGenerate };
