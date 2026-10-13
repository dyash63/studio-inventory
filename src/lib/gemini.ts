import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProposal, Category } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function analyzeInventoryPhoto(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<AIProposal[]> {
  if (!API_KEY || API_KEY === 'YOUR_GEMINI_KEY') {
    // Fallback mock for demo when no key
    console.warn('No Gemini API key – returning mock data');
    return [
      { name: 'T-Shirt', quantity: 3, category: 'clothes', confidence: 0.85 },
      { name: 'Underwear', quantity: 2, category: 'clothes', confidence: 0.78 },
      { name: 'Shorts', quantity: 1, category: 'clothes', confidence: 0.7 },
    ];
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an inventory assistant for a small studio apartment.
Analyze this photo carefully and list every distinct item you can identify that belongs in these categories:
- clothes (t-shirts, shirts, shorts, underwear, vests, socks, pants, jackets, etc.)
- kitchen (food, drinks, utensils, appliances visible in fridge/pantry)
- misc (chargers, toiletries, tools, household items)
- activity (sports gear, rackets, swim items, shoes)

Return ONLY a valid JSON array of objects with this exact shape:
[
  { "name": "string (canonical short name, e.g. T-Shirt, Milk, Badminton Racket)", "quantity": number, "category": "clothes"|"kitchen"|"misc"|"activity", "confidence": number between 0 and 1 }
]

Rules:
- Count carefully. If unsure of exact count, give your best estimate and lower confidence.
- Use consistent short names (T-Shirt not "blue cotton tshirt").
- Ignore furniture, walls, people, background.
- If nothing relevant, return empty array [].
- Do not wrap in markdown or add explanation. Pure JSON only.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType,
      },
    },
  ]);

  const text = result.response.text().trim();
  // Clean possible markdown
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as AIProposal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse Gemini response', text);
    return [];
  }
}
