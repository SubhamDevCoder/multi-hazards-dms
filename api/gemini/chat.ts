import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function getRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const body = await getRequestBody(req);
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Missing or invalid 'messages' array in request body." }));
      return;
    }

    let ai: GoogleGenAI;
    try {
      ai = getAiClient();
    } catch (err: any) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not set. Please ensure the API key is configured in Vercel Project Settings > Environment Variables.',
          fallbackReply: '⚠️ Tactical AI Copilot offline: GEMINI_API_KEY is not configured in Vercel environment variables. Please add GEMINI_API_KEY to your Vercel Project Settings > Environment Variables.',
        })
      );
      return;
    }

    const systemInstruction = `You are Gemini Copilot, the intelligent AI assistant integrated into this Multi-Hazard Disaster Command & Emergency Operations System.

YOUR ROLE & CAPABILITIES:
1. UNIVERSAL KNOWLEDGE & ASSISTANCE (NORMAL AI MODE):
   - You are a fully capable, articulate, and deeply knowledgeable AI assistant.
   - When users ask about ANY topic—science, history, technology, mathematics, software coding, physics, health, literature, world geography, how things work, or daily life—answer directly, naturally, and comprehensively just like a top-tier general AI.
   - Do NOT force rigid military tags or radio callsign prefixes onto normal educational, scientific, or conversational questions.
   - Be helpful, engaging, and thorough. Use clean Markdown formatting with clear headers, bullet points, and code blocks where helpful.

2. CRISIS & DISASTER OPERATIONS MODE:
   - When the user asks about active emergency situations, tactical operations, evacuations, weather telemetry, or emergency planning, seamlessly integrate your expert disaster response knowledge and the live situational context:
${context ? JSON.stringify(context, null, 2) : 'No active incident context specified.'}
   - Adhere to international emergency management standards (NDMA, FEMA, UN OCHA).
   - Provide concrete, actionable, prioritized life-safety advice, evacuation route assessments, and shelter logistics.
   - If asked to draft SMS warnings or public emergency broadcasts, provide clear, concise, calm text.

Always provide high-quality, complete, and accurate answers to each question asked.`;

    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || m.content || '') }],
    }));

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
    } catch (primaryErr: any) {
      console.warn('Gemini 3.8 Flash temporary latency/error:', primaryErr?.message);
      const scenarioName = context?.hazardType || 'Active Disaster Scenario';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          reply: `⚠️ **TACTICAL SATELLITE COMMS LINK INTERRUPTED (API DEMAND SPIKE)**\n\nDirect cloud inference is experiencing transient latency. Standard Emergency Operations Center (EOC) Field Protocols remain fully active.\n\n### [IMMEDIATE LIFE SAFETY ADVISORY]\n- **Current Situation**: Priority alert active for **${scenarioName.toUpperCase()}**.\n- **First Action**: Maintain immediate perimeter cordons and prioritize mass evacuation of critical shoreline/flood-plain sectors.\n- **Field Assets**: Keep NDRF rescue craft and medical convoys staged on high ground at muster points.\n- **Broadcast Frequency**: Radio dispatch frequency active on 156.800 MHz (VHF Marine Ch 16) / National Crisis Relay.\n\n*Tactical Engine will auto-reconnect on next operator transmission.*`,
        })
      );
      return;
    }

    const replyText = response?.text || 'Tactical advisory generated with empty payload.';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ reply: replyText }));
  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: error?.message || 'Error communicating with Gemini model.',
      })
    );
  }
}
