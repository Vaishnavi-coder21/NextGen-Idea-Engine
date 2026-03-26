require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios');

async function testAI() {
    console.log('--- AI API Verification Script ---');
    console.log('Provider:', process.env.AI_PROVIDER || 'openai (default)');

    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.warn('⚠️ OpenAI API Key is not set. Testing fallback logic...');
            return;
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        try {
            console.log('Testing OpenAI Chat...');
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello, who are you?" }],
                max_tokens: 10
            });
            console.log('✅ OpenAI Response:', completion.choices[0].message.content);
        } catch (e) {
            console.error('❌ OpenAI Error:', e.message);
        }
    } else if (provider === 'huggingface') {
        if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_huggingface_api_key_here') {
            console.warn('⚠️ Hugging Face API Key is not set. Testing fallback logic...');
            return;
        }
        try {
            console.log('Testing Hugging Face...');
            const response = await axios.post(
                "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
                { inputs: "Hello, who are you?" },
                { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
            );
            console.log('✅ Hugging Face Response:', response.data[0].generated_text.substring(0, 50) + '...');
        } catch (e) {
            console.error('❌ Hugging Face Error:', e.message);
        }
    }
}

testAI();
