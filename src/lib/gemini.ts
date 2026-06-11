// Gemini API client for NovaApp product analysis.
// Optimized for secure rotating environment variables on Vercel with auto-retry.
// Features: Safe input handling & Stable Vision Analysis via Gemini 2.5 Flash.
// Pure English Version.

const GEMINI_MODEL = "gemini-2.5-flash";

// Helper function to pause execution (sleep) for a given number of milliseconds
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Smart function to try keys sequentially with an auto-retry mechanism for status 503
async function fetchWithKeyRotation(body: any): Promise<Response> {
  const keys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_KEY_1,
    import.meta.env.VITE_GEMINI_KEY_2
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in Environment Variables.");
  }

  let lastError: any = null;
  const maxRetries = 2;

  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${currentKey}`;
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        if (retry > 0) {
          await sleep(2000);
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.status === 503 && retry < maxRetries) {
          lastError = `Status 503`;
          continue; 
        }

        if (res.status === 429 || res.status >= 500) {
          lastError = `Status ${res.status}`;
          break; 
        }

        return res;
      } catch (err) {
        lastError = err;
        if (retry === maxRetries) break;
      }
    }
  }

  throw new Error(`All configured Gemini API keys failed. Last error: ${lastError}`);
}

// Core function to analyze product ingredients (With Safe Type Checking)
export async function analyzeProductIngredients(imageBase64: string): Promise<string> {
  // Safe validation: Ensure imageBase64 is defined and is a string before calling string methods
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error("Invalid or empty image data received for analysis.");
  }

  // Safe cleaning of data URL metadata if present
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const prompt = "Analyze this product image. Identify all ingredients, list chemical/health hazards with scientific severity, and audit any marketing claims. CRITICAL: Detect the language of the text on the product packaging, and write your entire analysis and response strictly in that same language. Structure your response beautifully.";

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          }
        ]
      }
    ]
  };

  const response = await fetchWithKeyRotation(requestBody);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResult) {
    throw new Error("Empty or invalid response structure received from Gemini API.");
  }

  return textResult;
}

// Alias function to support App.tsx calling the old function name
export async function analyzeProductImage(imageBase64: string): Promise<string> {
  return analyzeProductIngredients(imageBase64);
}

// Dummy function to satisfy the old verifyAnalysisWithSearch export without breaking the build
export async function verifyAnalysisWithSearch(analysisText: string): Promise<any> {
  return { success: true, message: "Vision mode uses Gemini stable scientific knowledge bank." };
}

// Helper function required by App.tsx to convert file objects to base64 strings
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      const cleanBase64 = base64String.split(',')[1];
      resolve(cleanBase64);
    };
    reader.onerror = (error) => reject(error);
  });
}
