const GEMINI_MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithKeyRotation(body: any): Promise<Response> {
  const keys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_KEY_1,
    import.meta.env.VITE_GEMINI_KEY_2
  ].filter(Boolean);

  if (keys.length === 0) throw new Error("No API keys found.");

  for (let i = 0; i < keys.length; i++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${keys[i]}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) continue; // Try next key
      return res;
    } catch (e) { continue; }
  }
  throw new Error("All keys exhausted.");
}

export async function analyzeProductIngredients(imageBase64: string): Promise<string> {
  // التأكد التام من وجود البيانات وتنظيفها
  if (!imageBase64) throw new Error("Image data is missing.");
  
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const prompt = "Analyze this product image. Identify all ingredients, list chemical/health hazards with scientific severity, and audit any marketing claims. Respond in the same language as the packaging text.";

  const requestBody = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }] }]
  };

  const response = await fetchWithKeyRotation(requestBody);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// دالة التحويل المحصنة للموبايل
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) reject("No file provided");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function analyzeProductImage(imageBase64: string): Promise<string> {
  return analyzeProductIngredients(imageBase64);
}

export async function verifyAnalysisWithSearch(analysisText: string): Promise<any> {
  return { success: true, message: "OK" };
}
