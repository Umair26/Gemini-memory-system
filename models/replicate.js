import dotenv from "dotenv";
dotenv.config();

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

export async function replicateChat(message, model = "meta/meta-llama-3-8b-instruct") {
  try {
    const output = await replicate.run(model, {
      input: {
        prompt: message,
        max_new_tokens: 500,
        temperature: 0.7,
      }
    });

    // Output is an async iterator
    let fullText = "";
    for await (const chunk of output) {
      fullText += chunk;
    }

    return fullText.trim();

  } catch (error) {
    console.error("❌ Replicate error:", error.message);
    return null;
  }
}

// Alternative: Use Mistral on Replicate (free tier friendly)
export async function replicateMistral(message) {
  return await replicateChat(message, "mistralai/mistral-7b-instruct-v0.2");
}