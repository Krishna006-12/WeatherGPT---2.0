/**
 * Quick Diagnostic Script: Verify Gemini API Key
 *
 * Usage:
 *   npx tsx scripts/check-gemini.ts
 */

import { GeminiProvider } from "../src/services/ai/gemini-provider";
import * as fs from "fs";
import * as path from "path";

// Load .env.local or .env if present
function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && val && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function checkGemini() {
  console.log("\n==========================================");
  console.log("  WeatherGPT 2.0 — Gemini Key Diagnostic  ");
  console.log("==========================================\n");

  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

  if (!key || key.trim().length === 0) {
    console.error("❌ NO API KEY FOUND");
    console.error("   Neither GEMINI_API_KEY nor AI_API_KEY is defined in process.env or .env.local.");
    console.error("   Please create a .env.local file with:");
    console.error("   GEMINI_API_KEY=your_actual_gemini_api_key\n");
    process.exit(1);
  }

  const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "***";
  console.log(`🔑 Key detected: ${maskedKey}`);

  const provider = new GeminiProvider();
  console.log("📡 Sending test request to Gemini Generative Language API...");

  try {
    const response = await provider.generateCompletion(
      "Ping test: Reply with a JSON object {\"status\": \"active\", \"model\": \"gemini\"}",
      "You are a weather AI system diagnostic tool. Always respond in valid JSON.",
      {
        temperature: 0.1,
        maxTokens: 100,
        jsonMode: true,
      }
    );

    console.log("✅ SUCCESS! Gemini API key is working.");
    console.log("   Response received:\n");
    console.log(`   ${response.trim()}`);
    console.log("\n==========================================\n");
  } catch (error) {
    console.error("❌ FAILED to generate completion with Gemini.");
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`);
      console.error(`   Message: ${error.message}`);
    } else {
      console.error("   Unknown error:", error);
    }
    console.log("\n==========================================\n");
    process.exit(1);
  }
}

checkGemini();
