import { GoogleGenAI, Modality } from '@google/genai';

const GLOBAL_API_KEY = process.env.GEMINI_API_KEY;

const TELUGU_SYSTEM_PROMPT = `You are a professional Telugu customer support and sales agent named TeluguAI.

Primary language: Telugu (తెలుగు).
Always start conversations in Telugu.
If the customer switches to English, respond in English.
If the customer mixes Telugu and English, respond naturally using Telugu-English mix.
Keep responses short and conversational (2-3 sentences max).
Be warm, friendly, and professional.
After the conversation ends, classify the customer as: Interested, Follow Up, or Not Interested.`;

function getClient(apiKey?: string) {
  const key = apiKey || GLOBAL_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey: key });
}

export const GeminiProvider = {
  isConfigured: (userKey?: string) => !!(userKey || GLOBAL_API_KEY),

  async createEphemeralToken(systemInstruction?: string, apiKey?: string): Promise<{ name: string; expiresAt: number }> {
    const ai = getClient(apiKey);
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: 'gemini-3.1-flash-live-preview',
          config: {
            sessionResumption: {},
            temperature: 0.7,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction || TELUGU_SYSTEM_PROMPT }],
            },
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return { name: (token as any).name, expiresAt: Date.now() + 55_000 };
  },

  async generateSummary(transcript: string[], apiKey?: string): Promise<{
    summary: string;
    customer_intent: string;
    interest_level: string;
    sentiment: string;
    follow_up_required: boolean;
    key_notes: string;
  }> {
    const ai = getClient(apiKey);
    const conversation = transcript.join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze this Telugu call transcript and return ONLY valid JSON:\n\n${conversation}`,
      config: {
        systemInstruction: `You are an AI call analyst. Analyze Telugu call transcripts. Return ONLY valid JSON with these fields:
- summary: Brief summary in English (2-3 sentences)
- customer_intent: What the customer wants (one line)
- interest_level: "high", "medium", "low", or "unknown"
- sentiment: "positive", "neutral", or "negative"
- follow_up_required: boolean
- key_notes: Important points in English`,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const content = response.text || '{}';
    return JSON.parse(content);
  },

  async analyzeIntent(transcript: string[], apiKey?: string): Promise<{
    intent: string;
    status: string;
    follow_up: boolean;
  }> {
    const ai = getClient(apiKey);
    const conversation = transcript.join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Classify this customer conversation:\n\n${conversation}`,
      config: {
        systemInstruction: `Classify the customer's intent and status. Return ONLY valid JSON:
- intent: "product_inquiry", "pricing_question", "complaint", "general_inquiry", "support_request", or "other"
- status: "interested", "not_interested", "follow_up", or "unknown"
- follow_up: boolean`,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const content = response.text || '{}';
    return JSON.parse(content);
  },

  async generateAnalyticsInsights(campaignData: {
    total_calls: number;
    completed_calls: number;
    interested_leads: number;
    avg_duration: number;
  }, apiKey?: string): Promise<string> {
    const ai = getClient(apiKey);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Analyze this campaign performance data and provide 3-5 concise actionable insights:\n${JSON.stringify(campaignData, null, 2)}`,
      config: {
        systemInstruction: 'You are a sales analytics expert. Provide brief, actionable insights for Telugu cold-calling campaigns. Be specific and data-driven.',
        temperature: 0.5,
      },
    });

    return response.text || 'No insights available.';
  },

  getSystemPrompt: () => TELUGU_SYSTEM_PROMPT,
};
