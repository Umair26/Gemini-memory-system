import { togetherChat } from "./together.js";
import { hfChat } from "./huggingface.js";
import { askTogether } from "./together.js";


export async function getBestResponse(message) {

  // 1. Try Together
  const together = await togetherChat(message);
  if (together) return { reply: together, model: "Together AI" };

  // 2. Try HuggingFace
  const hf = await hfChat(message);
  if (hf) return { reply: hf, model: "HuggingFace" };

  // 3. Fallback to DeepSeek
  const deepseek = await askDeepSeek(message);
  if (deepseek) return { reply: deepseek, model: "DeepSeek" };

  return { reply: "All models failed", model: "None" };
}
