import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined. Please configure your key in the Secrets Panel.');
  }

  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Text-to-Image Generation
 * Model: gemini-3.1-flash-image-preview or gemini-3.1-flash-image (High-Quality image model)
 * We'll use "gemini-3.1-flash-image" or "gemini-3.1-flash-image-preview"
 */
export async function generateImageFromPrompt(prompt: string, aspectRatio: "1:1" | "4:3" | "16:9" | "9:16" = "1:1"): Promise<string> {
  const ai = getGeminiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: "512px" // Low latency for fast feedback
      }
    }
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error('No content returned from image generation model.');
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      const base64Data = part.inlineData.data;
      const mime = part.inlineData.mimeType || 'image/png';
      return `data:${mime};base64,${base64Data}`;
    }
  }

  throw new Error('Image data not found in prompt response.');
}

/**
 * Image-to-Image Editing
 * Model: gemini-3.1-flash-image-preview (High-Quality editing model)
 */
export async function editImageWithPrompt(base64DataWithHeader: string, prompt: string): Promise<string> {
  const ai = getGeminiClient();

  // Extract base64 clean string and mime type if available
  let cleanBase64 = base64DataWithHeader;
  let mimeType = 'image/png';

  const matches = base64DataWithHeader.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    cleanBase64 = matches[2];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "512px"
      }
    }
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error('No content returned from image editing model.');
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      const respBase64 = part.inlineData.data;
      const respMime = part.inlineData.mimeType || 'image/png';
      return `data:${respMime};base64,${respBase64}`;
    }
  }

  throw new Error('Edited image data not found in response.');
}

/**
 * Receipt / Invoice Image Analysis (Analyze Images)
 * Model: gemini-3.1-pro-preview (Strict mandate!)
 * Instruct it to perform OCR on the receipt, and structure it exactly as JSON schema matching our Expense inputs!
 */
export async function analyzeReceiptImage(base64DataWithHeader: string): Promise<{
  title: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}> {
  const ai = getGeminiClient();

  let cleanBase64 = base64DataWithHeader;
  let mimeType = 'image/jpeg';

  const matches = base64DataWithHeader.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    cleanBase64 = matches[2];
  }

  const prompt = `Perform OCR on this restaurant expense receipt or invoice. 
Analyze the supplier, totals, items, and date.
Extract the info structured into the requested JSON schema.
- Map the category of purchase to one of: 'Rent', 'Utility Bills', 'Raw Material', 'Maintenance', 'Other'.
- Date MUST be in strictly 'YYYY-MM-DD' format. If no date is found, use today's date.
- Title should be a nice descriptive summary, e.g. "Purchased fresh meat from ABC Wholesalers" or "Gas Bill - June".
- Amount must be a clean number representing the total paid or due amount.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        }
      },
      {
        text: prompt
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Descriptive title of the expense" },
          category: { type: Type.STRING, description: "Expense category: Rent, Utility Bills, Raw Material, Maintenance, or Other" },
          amount: { type: Type.NUMBER, description: "Total receipt amount" },
          date: { type: Type.STRING, description: "Incurred date in YYYY-MM-DD format" },
          notes: { type: Type.STRING, description: "Items detail, supplier name, invoice number, etc." }
        },
        required: ["title", "category", "amount", "date"]
      }
    }
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new Error('Failed to analyze image; empty response from Gemini.');
  }

  try {
    const data = JSON.parse(jsonText.trim());
    return {
      title: data.title || 'Receipt Expense',
      category: data.category || 'Other',
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || 'Analyzed automatically using Gemini Pro.'
    };
  } catch (err) {
    console.error('Error parsing JSON response from Gemini Pro:', jsonText, err);
    throw new Error('Gemini did not return valid JSON. Response received: ' + jsonText.substring(0, 100));
  }
}
