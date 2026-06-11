// Gemini API client for NovaApp product analysis.
// Optimized for secure rotating environment variables on Vercel with auto-retry.
// Features: Dynamic language matching & Live Google Search Grounding for verification.
// Pure English Version.

const GEMINI_MODEL = "gemini-2.5-flash";

// Helper function to pause execution (sleep) for a given number of milliseconds
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Smart function to try keys sequentially with an auto-retry mechanism for status 503
async function fetchWithKeyRotation(body: any): Promise<Response> {
  // Fetching main and backup keys from Vercel environment variables
  const keys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_KEY_1,
    import.meta.env.VITE_GEMINI_KEY_2
  ].filter(Boolean); // Filter out undefined keys

  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in Environment Variables.");
  }

  let lastError: any = null;
  const maxRetries = 2; // Number of retries per key if the server is busy

  // Iterate through available keys
  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${currentKey}`;
    
    // Retry loop for the current key in case of temporary Google server errors (like 503)
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        if (retry > 0) {
          console.log(`Retry #${retry} for Key ${i + 1} after server pressure...`);
          await sleep(2000); // Wait for 2 seconds to allow the server to recover
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        // If the server is overloaded (503), retry the same key first
        if (res.status === 503 && retry < maxRetries) {
          console.warn(`Google server is busy (503) for Key ${i + 1}. Retrying shortly...`);
          lastError = `Status 503 (Service Unavailable)`;
          continue; 
        }

        // If quota is exceeded (429) or internal error occurs (5xx except 503), switch to the next key
        if (res.status === 429 || res.status >= 500) {
          console.warn(`Key ${i + 1} failed with status ${res.status}. Moving to next key...`);
          lastError = `Status ${res.status}`;
          break; // Break the retry loop to move to the next key (i)
        }

        // If response is successful or a standard user error occurs (like 400), return the response
        return res;
      } catch (err) {
        console.warn(`Connection failed with Key ${i + 1} on attempt ${retry + 1}.`);
        lastError = err;
        if (retry === maxRetries) break; // Break if max retries reached for this key
      }
    }
  }

  throw new Error(`All configured Gemini API keys failed. Last error: ${lastError}`);
}

// Core function to analyze product ingredients (With Dynamic Language & Live Google Search)
export async function analyzeProductIngredients(imageBase64: string): Promise<string> {
  // Advanced prompt instructing Gemini to dynamically match the language of the image text
  const prompt = "Analyze this product image. Identify all ingredients, list chemical/health hazards with scientific severity, and audit any marketing claims. CRITICAL: Detect the language of the text on the product packaging, and write your entire analysis and response strictly in that same language. (e.g., if the packaging text is in Arabic, respond in Arabic; if English, respond in English; if Chinese, respond in Chinese, etc.). Structure your response beautifully.";

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }
    ],
    // Activating Live Google Search Grounding for automatic verification and source linking
    tools: [
      {
        googleSearch: {}
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
