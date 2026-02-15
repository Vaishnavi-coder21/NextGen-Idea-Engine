const Project = require('../backend/models/Project');
const fs = require('fs');
const path = require('path');

const manualData = `1 | AI Smart Attendance System | AI | Automate attendance using face recognition | CNN, Haar Cascade | Python, OpenCV | Poor lighting affects accuracy | 2024
2 | IoT Smart Waste Monitor | IoT | Monitor garbage levels in bins | Threshold Logic | Arduino, ESP8266 | No odor detection | 2023
3 | Parkinson Detection via Handwriting | AI | Detect early Parkinson signs from handwriting | CNN, ResNet | Python, TensorFlow | Small dataset size | 2025
4 | AI Crop Disease Detector | AI | Identify plant diseases from leaf images | CNN | Python, Keras | Limited to 5 crops | 2023
5 | Blockchain Voting System | Blockchain | Secure digital voting | SHA-256 | Solidity, Ethereum | Scalability issues | 2024
6 | Smart Traffic Density Analyzer | AI | Detect traffic congestion via CCTV | YOLO | Python, OpenCV | Not real-time optimized | 2024
7 | Student Performance Predictor | ML | Predict student results | Random Forest | Python, Scikit-learn | No psychological factors included | 2023
8 | AI Resume Screening Tool | NLP | Automate resume shortlisting | TF-IDF, SVM | Python, Flask | Bias in dataset | 2024
9 | Smart Irrigation System | IoT | Automate water usage based on soil moisture | Threshold Logic | Arduino, Sensors | No weather forecasting integration | 2022
10 | AI Chatbot for College | NLP | Automate student query responses | LSTM | Python, Flask | Limited language support | 2024
11 | Cyberbullying Detection System | NLP | Detect abusive content online | Naive Bayes | Python | Cannot detect sarcasm | 2023
12 | AI-Based Emotion Detector | AI | Detect emotions from facial images | CNN | OpenCV | Low accuracy in low light | 2024
13 | Road Accident Prediction | ML | Predict accident-prone zones | Logistic Regression | Python | Limited real-time data | 2023
14 | Smart Energy Meter | IoT | Monitor electricity consumption | Threshold Logic | ESP8266 | No mobile notification | 2022
15 | Fake News Detection | NLP | Detect fake online news | BERT | Python | Struggles with regional news | 2024
16 | Heart Disease Prediction | ML | Predict heart disease risk | KNN | Python | Small training dataset | 2023
17 | AI Virtual Doctor | AI | Provide preliminary medical advice | Decision Tree | Python | No real-time patient monitoring | 2024
18 | Smart Parking System | IoT | Detect parking availability | Ultrasonic Logic | Arduino | No reservation feature | 2023
19 | Hand Gesture Recognition | AI | Control devices via hand gestures | CNN | TensorFlow | Limited gesture dataset | 2024
20 | Voice-Based Gender Detection | ML | Detect gender from voice | SVM | Python | Noise sensitivity | 2023
21 | AI-Based Stress Detector | AI | Detect stress from handwriting | CNN | Python | Not clinically validated | 2025
22 | E-Learning Recommendation System | ML | Suggest courses to students | Collaborative Filtering | Python | Cold start problem | 2023
23 | Smart Helmet System | IoT | Detect helmet usage | IR Sensor Logic | Arduino | No accident alert feature | 2022
24 | Intrusion Detection System | Cybersecurity | Detect network attacks | Random Forest | Python | High false positives | 2024
25 | Smart Home Automation | IoT | Automate appliances | ESP Logic | ESP8266 | No voice assistant integration | 2023
26 | AI-Based Plagiarism Checker | NLP | Detect plagiarism in documents | Cosine Similarity | Python | Cannot detect paraphrasing fully | 2024
27 | AI Disease Symptom Checker | ML | Predict disease from symptoms | Decision Tree | Python | No medical expert validation | 2023
28 | Facial Age Prediction | AI | Predict age from facial image | CNN | TensorFlow | Accuracy drops above age 60 | 2024
29 | Online Exam Proctoring | AI | Detect cheating during exams | YOLO | Python | Requires high bandwidth | 2024
30 | Smart Fire Detection | IoT | Detect fire using sensors | Threshold Logic | Arduino | No SMS alert system | 2023
31 | Depression Detection from Text | NLP | Detect depression via social posts | LSTM | Python | Dataset bias | 2024
32 | Smart Water Quality Monitor | IoT | Monitor pH and turbidity | Sensor Logic | ESP32 | No mobile dashboard | 2023
33 | AI-Based Loan Approval | ML | Predict loan eligibility | Logistic Regression | Python | Limited financial features | 2024
34 | Object Detection System | AI | Detect multiple objects in real-time | YOLOv5 | Python | Hardware intensive | 2024
35 | Smart Blind Stick | IoT | Assist visually impaired | Ultrasonic Logic | Arduino | No GPS tracking | 2022
36 | Fake Profile Detection | ML | Detect fake social accounts | Random Forest | Python | High false positives | 2023
37 | AI-Based Skin Cancer Detection | AI | Detect melanoma from images | CNN | TensorFlow | Needs larger dataset | 2024
38 | Smart Weather Predictor | ML | Predict local weather | ARIMA | Python | Limited region data | 2023
39 | AI-Based Code Reviewer | NLP | Suggest improvements in code | Transformer | Python | Limited language support | 2025
40 | Smart Attendance via RFID | IoT | Automate attendance tracking | RFID Logic | Arduino | No biometric backup | 2022
41 | AI-Based Salary Predictor | ML | Predict salary based on skills | Linear Regression | Python | Ignores soft skills | 2024
42 | Smart Accident Alert System | IoT | Detect vehicle accidents | Accelerometer Logic | ESP8266 | No hospital auto-alert | 2023
43 | AI Movie Recommendation | ML | Suggest movies to users | Collaborative Filtering | Python | Cold start issue | 2024
44 | Air Pollution Predictor | ML | Predict AQI levels | Random Forest | Python | Limited sensor data | 2023
45 | AI-Based Legal Assistant | NLP | Answer legal queries | BERT | Python | Limited jurisdiction data | 2025
46 | Smart Classroom Monitoring | IoT | Monitor classroom noise & light | Sensor Logic | ESP32 | No analytics dashboard | 2023
47 | AI-Based Fraud Detection | ML | Detect fraudulent transactions | XGBoost | Python | Needs real-time data | 2024
48 | Smart Bus Tracking | IoT | Track bus location | GPS Logic | Arduino | No predictive delay feature | 2022
49 | AI-Based Image Captioning | AI | Generate captions for images | CNN + LSTM | TensorFlow | Limited vocabulary | 2024
50 | Handwriting-Based Gender Prediction | AI | Predict gender from handwriting | CNN | Python | Small balanced dataset required | 2025`;

const parseAndSeed = async () => {
    try {
        console.log('Parsing manual projects...');
        const lines = manualData.split('\n');
        const projects = lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            return {
                project_id: `PROJ-MANUAL-${parts[0]}`,
                project_title: parts[1],
                domain: parts[2],
                problem_statement: parts[3],
                algorithms_used: parts[4].split(',').map(a => a.trim()),
                technologies_used: parts[5].split(',').map(t => t.trim()),
                limitations: parts[6],
                year: parseInt(parts[7]),
                innovation_score: 70 + Math.floor(Math.random() * 25),
                ai_confidence: parseFloat((88 + (Math.random() * 8)).toFixed(1)),
                research_gap: "Standard implementation lacking robust real-time optimization.",
                scalability_factor: "Medium to High",
                future_scope: "Expansion with advanced ML models."
            };
        });

        // Clear existing and add new
        const DATA_PATH = path.join(__dirname, '../data/projects.json');
        fs.writeFileSync(DATA_PATH, JSON.stringify(projects, null, 2));

        console.log(`Successfully seeded ${projects.length} manual projects!`);
    } catch (err) {
        console.error('Error during seeding:', err);
    }
};

parseAndSeed();
