import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

const SCAD_SYSTEM_INSTRUCTIONS = `Output only raw .scad code, no prose or markdown
Use CSG operations (union, difference, hull, minkowski) for complexity
Set $fn = 64 for smooth curves
Keep models 20–120 mm and watertight/manifold
Use modules and for-loops for repeated geometry
Be creative — no lazy single-primitive outputs`;

const MODIFY_SYSTEM_PROMPT = `You are an expert OpenSCAD programmer.

The user will provide an existing OpenSCAD file and a modification request.
Respond with ONLY the complete modified .scad file — no explanation, no markdown fences.

Rules:
1. Preserve all parts of the original that the modification doesn't affect.
2. Apply the requested change precisely and minimally.
3. Keep $fn = 64 and all existing modules/variables unless asked to change them.
4. The output must be the full file, not a diff or partial snippet.
5. Do not add comments explaining what changed.`

async function generateText(prompt: string) {
    const result = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${SCAD_SYSTEM_INSTRUCTIONS}\n\n${prompt}`,
    });
    return result.text ?? '';
}

async function modifyText(original: string, prompt: string) {
    const result = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${MODIFY_SYSTEM_PROMPT}\n\n${original}\n\n${prompt}`,
    });
    return result.text ?? '';
}

export default gemini;
export { generateText, modifyText };
