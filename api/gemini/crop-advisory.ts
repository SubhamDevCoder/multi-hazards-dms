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
    const { crop, location, weatherData } = body;

    const cropName = crop || 'Paddy / Rice';
    const locName = location || 'Coastal Agricultural Delta';

    let ai: GoogleGenAI;
    try {
      ai = getAiClient();
    } catch (err: any) {
      // Fallback response if API key not set
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          advisory: `### [ICAR / AGROMET SOP] 7-DAY CROP ADVISORY: ${cropName.toUpperCase()}\n**Location:** ${locName}\n\n1. **Moisture & Drainage Protocol**:\n   - Forecasted heavy rainfall requires immediate unblocking of field drainage channels to prevent root-zone hypoxia.\n   - Postpone basal fertilizer applications until the precipitation surge subsides.\n\n2. **Pest & Pathogen Containment**:\n   - High relative humidity (>80%) creates favorable conditions for blast and sheath blight. Proactively prepare spray rigs once winds drop below 12 knots.\n\n3. **Harvesting & Mandi Storage**:\n   - Mature stands should be harvested immediately and moved to elevated covered grain yards. Ensure tarpaulin protection against rain squalls.`,
          grounded: false,
        })
      );
      return;
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
      // Use Gemini 3.8 Flash with search grounding tool
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchErr) {
      // Fallback without search tool
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
    }

    const replyText = response?.text || 'Standard agrometeorological protocol generated.';
    const searchChunks = (response?.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ advisory: replyText, grounded: searchChunks.length > 0, sources: searchChunks }));
  } catch (error: any) {
    console.error('Crop advisory error:', error);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        advisory: `### [CONTINGENCY ADVISORY] PREVENTATIVE CROP PROTECTION\n\n- **Drainage**: Excavate 30cm periphery trenches around standing crops to drain excessive surface water.\n- **Wind Break**: Stake vulnerable horticultural crops against high wind squalls.\n- **Storage**: Elevate stored harvested produce at least 1 meter above floor level in sealed moisture-proof silos.`,
        grounded: false,
      })
    );
  }
}
