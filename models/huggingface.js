import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
dotenv.config();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function hfChat(message) {
  try {
    // Try multiple models as fallback
    const models = [
      'microsoft/Phi-3-mini-4k-instruct',
      'meta-llama/Llama-3.2-3B-Instruct',
      'HuggingFaceH4/zephyr-7b-beta'
    ];

    for (const model of models) {
      try {
        const response = await hf.chatCompletion({
          model: model,
          messages: [{ role: 'user', content: message }],
          max_tokens: 500,
          temperature: 0.7,
        });
        
        console.log(`✅ HuggingFace success with: ${model}`);
        return response.choices[0].message.content;
      } catch (err) {
        console.log(`⚠️ ${model} failed, trying next...`);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ HuggingFace error:', error.message);
    return null;
  }
}