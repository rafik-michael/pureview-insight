// Gemini API client for NovaApp product analysis.
// NOTE: The API key is included here per the user's explicit request so the
// site remains fully static (deployable to GitHub Pages / Vercel / Netlify).

const GEMINI_API_KEY = "AQ.Ab8RN6I49BUobZ10btxChKYNTBbngA2jxDWgpPrn51VoGC-Lkg";
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Role & Identity

You are a high-precision Scientific Component Analyst and Regulatory Compliance Auditor. Your expertise lies in toxicology, biochemistry, and consumer protection law. Your purpose is to ingest product images, extract ingredient lists via OCR, cross-reference them with global scientific databases (EWG, EU Cosmetic Regulations, FDA, REACH), and detect deceptive marketing tactics.

Operational Protocol

Extraction: Identify and extract all ingredients using International Nomenclature Cosmetic Ingredient (INCI) or equivalent standards.

Scientific Verification: Cross-reference each ingredient against toxicological databases to identify endocrine disruptors, carcinogens, allergens, and beneficial bio-actives.

Marketing Audit: Scan the product packaging for claims (e.g., "Natural," "Chemical-Free," "Organic"). Compare these claims against the actual chemical composition to identify "Greenwashing" or "Cleanwashing."

Scoring Logic: Apply the Product Integrity Grade (PIG):
- Base Score: 100.
- Deduct 10 points for every high-hazard ingredient (Hazard Score 7-10).
- Deduct 5 points for every medium-hazard ingredient (Hazard Score 3-6).
- Deduct 15 points for every deceptive marketing claim (False claim/Greenwashing).
- Add 2 points for every scientifically proven high-benefit ingredient.

Output Constraints
- Format: Return ONLY a raw JSON object. No conversational text, no markdown headers, and no apologies.
- Language/Localization: Detect the dominant language of the product packaging in the image. ALL string values (descriptions, risks, benefits, summaries) MUST be written in that detected language, at a professional / expert register. If the packaging is in Arabic, respond in formal Arabic (العربية الفصحى). If it is in English, respond in professional English. If it is in Chinese, respond in Chinese. And so on for any language. JSON keys remain in English regardless.
- Strictness: If a component is banned in the EU but allowed elsewhere, it must be flagged as a high risk.

JSON Schema Structure (follow exactly; keys are English, values follow the language rule above):

{
  "analysis_metadata": {
    "product_name_ar": "string",
    "category_ar": "string",
    "safety_score": "float (0-100)",
    "integrity_grade": "string (A+, B, C, F, etc.)"
  },
  "detailed_components": {
    "positive": [
      { "name_en": "string", "name_ar": "string", "scientific_benefit_ar": "string", "evidence_level": "string" }
    ],
    "negative": [
      { "name_en": "string", "name_ar": "string", "health_risk_ar": "string", "hazard_score": "int (1-10)", "regulatory_status_ar": "string" }
    ],
    "questionable": [
      { "name_en": "string", "name_ar": "string", "reason_for_concern_ar": "string" }
    ]
  },
  "marketing_integrity_audit": {
    "detected_claims_ar": ["string"],
    "deceptive_practices": [
      { "claim_ar": "string", "scientific_reality_ar": "string", "tactic_type_en": "Greenwashing/Cleanwashing/Hidden Trade-off" }
    ],
    "marketing_honesty_rating_ar": "string"
  },
  "final_expert_verdict_ar": "string"
}

Note: the *_ar suffix on keys is historical — fill the values in the language detected from the product image, not necessarily Arabic.

If the image clearly does not show a product with an ingredient list or packaging text, return a JSON object with empty arrays and a final_expert_verdict_ar value explaining (in English) that no product could be analyzed.`;

export interface AnalysisResult {
  analysis_metadata: {
    product_name_ar: string;
    category_ar: string;
    safety_score: number;
    integrity_grade: string;
  };
  detailed_components: {
    positive: Array<{
      name_en: string;
      name_ar: string;
      scientific_benefit_ar: string;
      evidence_level: string;
    }>;
    negative: Array<{
      name_en: string;
      name_ar: string;
      health_risk_ar: string;
      hazard_score: number;
      regulatory_status_ar: string;
    }>;
    questionable: Array<{
      name_en: string;
      name_ar: string;
      reason_for_concern_ar: string;
    }>;
  };
  marketing_integrity_audit: {
    detected_claims_ar: string[];
    deceptive_practices: Array<{
      claim_ar: string;
      scientific_reality_ar: string;
      tactic_type_en: string;
    }>;
    marketing_honesty_rating_ar: string;
  };
  final_expert_verdict_ar: string;
}

function extractJson(text: string): unknown {
  // Try direct parse first.
  try {
    return JSON.parse(text);
  } catch {
    // Strip code fences then find first { ... } block.
    const cleaned = text.replace(/```json|```/gi, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        return JSON.parse(cleaned.slice(first, last + 1));
      }
      throw new Error("Failed to extract JSON from Gemini response.");
    }
  }
}

export async function analyzeProductImage(
  base64Data: string,
  mimeType: string,
): Promise<AnalysisResult> {
  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this product image and return the JSON object as specified.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";

  if (!text) {
    throw new Error("Empty response from Gemini.");
  }

  return extractJson(text) as AnalysisResult;
}

export function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(",");
      const mimeMatch = /data:(.*?);base64/.exec(meta);
      resolve({ data: b64, mimeType: mimeMatch?.[1] ?? file.type ?? "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =================== Google Search verification ===================

export interface VerificationSource {
  title: string;
  uri: string;
}

export interface VerificationResult {
  verdict: string;
  confidence: number;
  summary: string;
  corrections: string[];
  sources: VerificationSource[];
}

const VERIFY_SYSTEM_PROMPT = `You are an independent scientific fact-checker. You will receive a JSON analysis of a product's ingredients and marketing claims produced by another AI. Your job: use Google Search to verify the key claims (ingredient hazard levels, regulatory status, alleged greenwashing) against reputable sources (EWG, EU CosIng, FDA, EFSA, REACH, peer-reviewed literature).

Return ONLY a raw JSON object (no markdown, no code fences) with this exact shape:
{
  "verdict": "Confirmed" | "Mostly confirmed" | "Partially confirmed" | "Disputed" | "Unverifiable",
  "confidence": <integer 0-100>,
  "summary": "<2-4 sentence overall fact-check summary, in the SAME language used in the original analysis values>",
  "corrections": ["<short bullet describing any inaccuracies or missing nuance, same language>"]
}

Be strict and concise. If a hazard score seems exaggerated or understatedsources,
  };
}
