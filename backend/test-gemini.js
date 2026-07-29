import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hello',
    });
    console.log('Response properties:', Object.keys(response));
    console.log('Response text:', response.text);
  } catch (err) {
    console.error('Error object:', err);
  }
}
test();
