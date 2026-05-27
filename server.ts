import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it under AI Studio custom secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// -------------------------------------------------------------
// SECURE SERVER-SIDE GEMINI ENDPOINTS
// -------------------------------------------------------------

// 1. AI Insights & Risk Analyzer structured endpoint
app.post("/api/gemini/insights", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { summary } = req.body;

    const prompt = `
      You are an elite, highly professional AI Financial Advisor called "Finance AI".
      Based on the following JSON financial summary of the user, provide 4 actionable and highly specific custom recommendations or insights.
      Focus heavily on "PORTFOLIO RISK ANALYSIS".
      Detect sector concentration, diversification, risk exposure, volatility, and budget risks.
      
      User Data:
      ${JSON.stringify(summary, null, 2)}
      
      Generate a valid JSON array of objects representing these insights. Each object must have fields:
      - title: A highly punchy title (e.g. "High Sector Concentration", "Low Diversification Risk")
      - description: Actionable professional advice with numbers if relevant. E.g. "Your portfolio is heavily concentrated in banking sector."
      - iconType: One of: 'saving', 'investing', 'alert', 'growth'
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              iconType: { type: Type.STRING },
            },
            required: ["title", "description", "iconType"]
          }
        }
      }
    });

    const text = response.text || "[]";
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Gemini Insights Error:", err);
    res.status(500).json({ error: err.message || "Failed to process insights." });
  }
});

// 2. Chatbot response proxy
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { message, fullContext } = req.body;

    const systemInstruction = `
      You are "Finance AI", a world-class financial advisory chatbot integrated into FinanceTracker Pro (styled after premium platforms like Zerodha, Groww, INDmoney).
      The user's real-time financial ledger data is:
      ${JSON.stringify(fullContext, null, 2)}
      
      Analyze this profile carefully when answering queries. Answer concisely, using human-friendly numbers, correct currency indicators (e.g. ₹ or $ based on user context), and real calculation breakdowns where applicable. Never mention file paths or technical variables like "transactions[0]". Be helpful, encouraging, and highly professional.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text || "I was unable to formulate a response." });
  } catch (err: any) {
    console.error("Gemini Chat Error:", err);
    res.status(500).json({ error: err.message || "Failed to query Finance AI." });
  }
});

// 3. Financial Predictions & Forecast Model
app.post("/api/gemini/predictions", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { dataSummary } = req.body;

    const prompt = `
      You are "Finance AI", an expert forecasting analyst. Review the user's financial profile:
      ${JSON.stringify(dataSummary, null, 2)}
      
      Formulate 4 smart future projections/forecasts:
      1. Future savings prediction (e.g. cumulative savings over 6-12 months)
      2. Expense forecasting (e.g. specific categories with higher velocity or warnings)
      3. Portfolio growth with compounded estimation (e.g. passive growth, regular SIP compounding)
      4. Net worth projection or a specific Budget limit alert.
      
      Generate a valid JSON array of objects representing these projects. Each object must have fields:
      - title: Prediction category (e.g. 'Cash Flow Forecast', 'Wealth Projection', 'Budget Burn Warning')
      - rate: Suggested confidence metric or growth rate (e.g., 'Medium-High', '+15% p.a.', 'Urgent')
      - detail: Clear descriptive analysis with estimated dollar or rupee figures.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              rate: { type: Type.STRING },
              detail: { type: Type.STRING },
            },
            required: ["title", "rate", "detail"]
          }
        }
      }
    });

    const text = response.text || "[]";
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Gemini Predictions Error:", err);
    res.status(500).json({ error: err.message || "Failed to compile forecasts." });
  }
});

// -------------------------------------------------------------
// STATIC FILES & SPA SERVING HANDLERS
// -------------------------------------------------------------

async function startServer() {
  // Vite dev mode vs production routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
