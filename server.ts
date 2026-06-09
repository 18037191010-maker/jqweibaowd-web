import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialize Gemini client to prevent server crash if key is missing on startup.
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// ---------------- SERVER API ROUTES ----------------

// API endpoint to verify connection
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 1. High-reliability endpoint to extract text content from Word (.docx) file uploads
app.post("/api/parse-word", async (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64 || typeof base64 !== "string") {
      return res.status(400).json({ error: "base64 of docx file is required." });
    }

    const buffer = Buffer.from(base64, "base64");
    const textResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });
    return res.json({ 
      text: textResult.value || "", 
      html: htmlResult.value || "" 
    });

  } catch (error: any) {
    console.error("Error parsing word document in backend:", error);
    return res.status(500).json({ error: error.message || "Failed to parse word document" });
  }
});

// 2. Automagically fill out the fields of a template based on user's natural description of a scenario
app.post("/api/ai/auto-fill", async (req, res) => {
  try {
    const { fields, description } = req.body;
    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required." });
    }
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: "fields schema list is required." });
    }

    const ai = getGeminiClient();
    const fieldsDescription = fields.map(f => `- Key: "${f.key}", Label: "${f.label}", Type: "${f.type}"`).join("\n");
    
    const prompt = `We have a formal document template with the following input fields:
${fieldsDescription}

The user has described their scenario or input details like this:
"${description}"

Based on the instructions and details provided, extract or synthesize highly professional, accurate, and correct values for each of the fields listed. Follow correct formatting, correct capitalization for names, appropriate formal phrasing, and correct ISO or custom date styles.
Return the filled value for every field key. Do not miss any key.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an intelligent data-extraction officer. Review user descriptions against desired fields and create appropriate, professionally-tuned answers under a strict JSON format structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fieldValues: {
              type: Type.ARRAY,
              description: "Array of generated values linked to their respective field keys",
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING, description: "The field identifier key" },
                  value: { type: Type.STRING, description: "The parsed/generated text value for the field" }
                },
                required: ["key", "value"]
              }
            }
          },
          required: ["fieldValues"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json(result);

  } catch (error: any) {
    console.error("Error auto-filling template fields:", error);
    return res.status(500).json({ error: error.message || "Failed to parse scenario for auto-filling." });
  }
});

// 3. Optimize a specific field text value based on quick AI commands (formalize, summarize, expand)
app.post("/api/ai/optimize-field", async (req, res) => {
  try {
    const { text, command, label } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text parameter is required." });
    }

    const ai = getGeminiClient();
    
    const prompt = `We have an active document input field "${label || 'Document content'}".
The current text value is:
"${text}"

The user wants to polish this value with the command instruction:
"${command || 'Make it more professional and grammatically correct.'}"

Please process the content and return only the optimized, revised text. Keep it appropriate for a formal document template.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional editor. Return ONLY the polished final piece of text with no introductions, no closing remarks, or quotation wrappers."
      }
    });

    const optimizedText = (response.text || "").trim();
    return res.json({ optimizedText });

  } catch (error: any) {
    console.error("Error optimizing text with Gemini:", error);
    return res.status(500).json({ error: error.message || "Failed to polish text value." });
  }
});

// ---------------- VITE MIDDLEWARE SETUP ----------------

async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

configureServer();
