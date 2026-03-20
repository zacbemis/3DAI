import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function generateText(prompt: string) {
  const result = await gemini.generateText({
    model: 'gemini-2.5-flash',
    prompt: prompt,
  });
  return result.text;
}

export default gemini;