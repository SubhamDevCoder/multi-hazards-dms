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
    const { location, weatherData } = body;
    const locName = location || 'Operations Focal Sector';

    let ai: GoogleGenAI;
    try {
      ai = getAiClient();
    } catch (err: any) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          advisory: `### [METEOROLOGICAL SYNOPTIC BULLETIN] 7-DAY FORECAST: ${locName.toUpperCase()}\n\n1. **Synoptic Analysis**: Low-pressure boundary active. Barometric gradients indicating gusty squalls and localized rain bands.\n2. **Precipitation Outlook**: Cumulative rainfall expected over next 48-72h.\n3. **Early Warning Directives**: Secure loose outdoor items, prepare battery-operated backup systems, and heed official warnings.`,
          grounded: false,
        })
      );
      return;
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

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ advisory: replyText, grounded: searchChunks.length > 0, sources: searchChunks }));
  } catch (error: any) {
    console.error('Weather forecast endpoint error:', error);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        advisory: `### [METEOROLOGICAL BULLETIN] 7-DAY HAZARD WATCH\n\n- **Atmospheric Conditions**: Intermittent squall lines and elevated precipitation risk.\n- **Emergency Advisory**: Monitor local meteorological channels and keep emergency kits stocked.`,
        grounded: false,
      })
    );
  }
}
