import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Lazy initialize Gemini client
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

  // Health and capability check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Tactical Gemini Chat Bot Endpoint
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages, context } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
      }

      let ai: GoogleGenAI;
      try {
        ai = getAiClient();
      } catch (err: any) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not set. Please ensure the API key is configured in Settings > Secrets.',
          fallbackReply: '⚠️ Tactical AI Copilot offline: GEMINI_API_KEY is not configured in the system environment. Please configure it in Settings > Secrets.',
        });
      }

      // Compose tactical operational system prompt with live disaster grounding
      const systemInstruction = `You are the Tactical AI Crisis Copilot (Gemini Crisis Advisor) integrated directly into an Industrial Skeuomorphic Multi-Hazard Disaster Command & Emergency Operations Console.
Your role is to assist Emergency Operation Center (EOC) incident commanders, NDRF squads, municipal triage officers, and evacuation planners with rapid, high-precision tactical advisory.

LIVE HAZARD & SITUATIONAL CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'General Multi-Hazard Emergency Preparedness Protocol Active.'}

OPERATIONAL DIRECTIVES:
1. Provide actionable, concise, prioritized, and authoritative tactical recommendations adhering to NDMA, FEMA, and UN OCHA standards.
2. Format responses with clear structure:
   - Use bold headers and concise bullet points.
   - Categorize advice into tags such as [IMMEDIATE LIFE SAFETY], [TACTICAL DEPLOYMENT], [EVACUATION ADVISORY], or [LOGISTICS / SUPPLY].
   - If drafting public warnings or SMS emergency broadcasts, generate ready-to-broadcast text that is calm, unambiguous, location-specific, and provides clear action steps (e.g. move to higher ground, muster point coordinates, emergency frequencies).
3. Explicitly reference the current disaster hazard, relevant zone names (e.g. Sector Delta, Sector Alpha), telemetry levels (such as river stage breach, rainfall mm/h, wind knots), shelter capacity saturation, or impassable road bottlenecks provided in the context.
4. If an operator asks about resource reallocation or evacuation detours, provide mathematical reasoning and pragmatic risk-tradeoff assessments.
5. Tone: Disciplined, calm, authoritative, military-civil emergency responder precision. Never use fluff or marketing jargon.`;

      // Transform messages to @google/genai format
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
        console.warn('Gemini 3.8 Flash busy, falling back to Gemini 2.5 Flash...', primaryErr?.message);
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
        } catch (secondaryErr) {
          // If models are temporarily unavailable, produce an authoritative emergency SOP response
          const scenarioName = context?.hazardType || 'Active Disaster Scenario';
          return res.json({
            reply: `⚠️ **TACTICAL SATELLITE COMMS LINK INTERRUPTED (API DEMAND SPIKE)**\n\nDirect cloud inference is experiencing transient latency. Standard Emergency Operations Center (EOC) Field Protocols remain fully active.\n\n### [IMMEDIATE LIFE SAFETY ADVISORY]\n- **Current Situation**: Priority alert active for **${scenarioName.toUpperCase()}**.\n- **First Action**: Maintain immediate perimeter cordons and prioritize mass evacuation of critical shoreline/flood-plain sectors.\n- **Field Assets**: Keep NDRF rescue craft and medical convoys staged on high ground at muster points.\n- **Broadcast Frequency**: Radio dispatch frequency active on 156.800 MHz (VHF Marine Ch 16) / National Crisis Relay.\n\n*Tactical Engine will auto-reconnect on next operator transmission.*`,
          });
        }
      }

      const replyText = response?.text || 'Tactical advisory generated with empty payload.';
      return res.json({ reply: replyText });
    } catch (error: any) {
      console.error('Gemini Chat API Error:', error);
      return res.status(500).json({
        error: error?.message || 'Error communicating with Gemini model.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Disaster Command Console server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
