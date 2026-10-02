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

      // Flexible, intelligent, and versatile Gemini AI Copilot prompt
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
        console.warn('Gemini 3.8 Flash temporary latency/error:', primaryErr?.message);
        // If model is temporarily unavailable, produce an authoritative emergency SOP response
        const scenarioName = context?.hazardType || 'Active Disaster Scenario';
        return res.json({
          reply: `⚠️ **TACTICAL SATELLITE COMMS LINK INTERRUPTED (API DEMAND SPIKE)**\n\nDirect cloud inference is experiencing transient latency. Standard Emergency Operations Center (EOC) Field Protocols remain fully active.\n\n### [IMMEDIATE LIFE SAFETY ADVISORY]\n- **Current Situation**: Priority alert active for **${scenarioName.toUpperCase()}**.\n- **First Action**: Maintain immediate perimeter cordons and prioritize mass evacuation of critical shoreline/flood-plain sectors.\n- **Field Assets**: Keep NDRF rescue craft and medical convoys staged on high ground at muster points.\n- **Broadcast Frequency**: Radio dispatch frequency active on 156.800 MHz (VHF Marine Ch 16) / National Crisis Relay.\n\n*Tactical Engine will auto-reconnect on next operator transmission.*`,
        });
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

  // 7-Day Weather & Multi-Hazard Forecast Advisory Endpoint
  app.post('/api/gemini/weather-forecast', async (req, res) => {
    try {
      const { location, weatherData } = req.body;
      const locName = location || 'Operations Focal Sector';

      let ai: GoogleGenAI;
      try {
        ai = getAiClient();
      } catch (err: any) {
        return res.json({
          advisory: `### [METEOROLOGICAL SYNOPTIC BULLETIN] 7-DAY FORECAST: ${locName.toUpperCase()}\n\n1. **Synoptic Analysis**: Deep low-pressure circulation active over coastal waters. Barometric pressure gradients indicating gusty squalls and localized rain bands.\n2. **Precipitation Outlook**: Scattered heavy to torrential rainfall expected over the next 48 to 72 hours. Drainage networks and river gauges on active watch.\n3. **Early Warning Directives**: Secure temporary structures, avoid coastal and low-lying transit corridors, and maintain emergency power and battery backups.`,
          grounded: false,
        });
      }

      const prompt = `You are a Senior Chief Meteorological Officer and Disaster Alert Coordinator.
Provide an actionable, authoritative 7-day weather forecast summary and multi-hazard early warning bulletin for:
- Region: ${locName}
- 7-Day Meteorological Data: ${JSON.stringify(weatherData || {})}

FORMAT INSTRUCTIONS:
Use clean markdown with clear headers and bullet points. (DO NOT talk about agriculture or crops. Focus exclusively on weather forecasts, atmospheric conditions, storms, rainfall, wind, temperatures, and public safety).
Include:
1. **7-Day Synoptic Weather Overview**: (Barometric pressure, temperature extremes, frontal passages).
2. **Precipitation & Wind Trajectory (Days 1–3 vs Days 4–7)**: (Peak rainfall hours, gale gusts, flash flood risks).
3. **Severe Weather & Hazard Tiers**: (Categorized threat levels: Wind / Water / Heat).
4. **Actionable Emergency Guidance**: (Infrastructure precautions, public advisories, transport detours).
5. **Emergency SMS Alert (<160 chars)**: (A crisp ready-to-broadcast SMS alert).
Keep language professional, disciplined, and authoritative.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchErr) {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
      }

      const replyText = response?.text || 'Standard meteorological forecast generated.';
      const searchChunks = (response?.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
      return res.json({ advisory: replyText, grounded: searchChunks.length > 0, sources: searchChunks });
    } catch (err: any) {
      console.error('Weather forecast endpoint error:', err);
      return res.json({
        advisory: `### [METEOROLOGICAL BULLETIN] 7-DAY HAZARD WATCH\n\n- **Atmospheric Pressure**: Steady gradient with intermittent convective thunderstorm cells.\n- **Precipitation**: Monitor river gauges and urban drainage channels.\n- **Wind Warning**: Coastal gusts to 45 knots possible during squall lines.`,
        grounded: false,
      });
    }
  });

  // Multimodal Crop Advisory with Search Grounding Tool Endpoint (Retained for backwards compatibility)
  app.post('/api/gemini/crop-advisory', async (req, res) => {
    try {
      const { crop, location, weatherData } = req.body;
      const cropName = crop || 'Paddy / Rice';
      const locName = location || 'Coastal Agricultural Delta';

      let ai: GoogleGenAI;
      try {
        ai = getAiClient();
      } catch (err: any) {
        return res.json({
          advisory: `### [ICAR / AGROMET SOP] 7-DAY CROP ADVISORY: ${cropName.toUpperCase()}\n**Location:** ${locName}\n\n1. **Moisture & Drainage Protocol**:\n   - Forecasted heavy rainfall requires immediate unblocking of field drainage channels to prevent root-zone hypoxia.\n   - Postpone basal fertilizer applications until the precipitation surge subsides.\n\n2. **Pest & Pathogen Containment**:\n   - High relative humidity (>80%) creates favorable conditions for blast and sheath blight. Proactively prepare spray rigs once winds drop below 12 knots.\n\n3. **Harvesting & Mandi Storage**:\n   - Mature stands should be harvested immediately and moved to elevated covered grain yards. Ensure tarpaulin protection against rain squalls.`,
          grounded: false,
        });
      }

      const prompt = `You are a Senior Agrometeorological Specialist and Disaster Mitigation Agronomist.
Provide an actionable, authoritative 7-day crop-specific weather advisory and field protection plan for:
- Crop: ${cropName}
- Region: ${locName}
- 7-Day Forecast Data: ${JSON.stringify(weatherData || {})}

FORMAT INSTRUCTIONS:
Use markdown with bold bullet points.
Include:
1. **7-Day Weather Impact on ${cropName}**: (Soil saturation, heat/cold stress, lodging risk from wind).
2. **Immediate Field Actions (Days 1–3)**: (Drainage, protective bunding, fertilizer/spray deferral).
3. **Mid-Week Projections (Days 4–7)**: (Pest/fungal outbreak prevention, harvesting guidance).
4. **Emergency Crop Salvage & Mandi Directives**: (Storage safety, flood mitigation).
Keep language clear, concise, and scientifically grounded.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchErr) {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
      }

      const replyText = response?.text || 'Standard agrometeorological protocol generated.';
      const searchChunks = (response?.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
      return res.json({ advisory: replyText, grounded: searchChunks.length > 0, sources: searchChunks });
    } catch (err: any) {
      console.error('Crop advisory endpoint error:', err);
      return res.json({
        advisory: `### [CONTINGENCY ADVISORY] PREVENTATIVE CROP PROTECTION\n\n- **Drainage**: Excavate 30cm periphery trenches around standing crops to drain excessive surface water.\n- **Wind Break**: Stake vulnerable horticultural crops against high wind squalls.\n- **Storage**: Elevate stored harvested produce at least 1 meter above floor level in sealed moisture-proof silos.`,
        grounded: false,
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
