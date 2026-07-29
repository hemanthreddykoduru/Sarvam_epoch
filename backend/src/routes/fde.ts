import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { GoogleGenAI } from '@google/genai';

const router = Router();

router.post('/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `You are an AI Agent builder for Deal My Calls. Your job is to convert a user's natural language request into a valid JSON agent configuration.
Return ONLY valid JSON. No markdown formatting, no backticks.
The JSON must have this structure:
{
  "name": "Short, catchy name for the agent",
  "system_prompt": "A detailed system prompt instructing the agent on its role, goals, and constraints. Must be in English.",
  "first_message": "The very first message the agent says when the call connects. Write this in Telugu script if the agent is for a Telugu business.",
  "description": "A 1-sentence description of what this agent does."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini returned an empty response');
    }

    const agentConfig = JSON.parse(jsonText);
    
    res.json({
      success: true,
      agent: agentConfig
    });
  } catch (error: any) {
    console.error('FDE Generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate agent' });
  }
});

export default router;
