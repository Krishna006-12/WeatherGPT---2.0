/**
 * Voice Service for Phase 12 Voice Assistant & Speech Intelligence.
 * Formats natural spoken briefings, cleans text for TTS synthesis, and computes voice metrics.
 */

import type { WeatherSnapshot } from "@/types/weather";
import type { WeatherRiskReport } from "@/types/risk";
import type { AgricultureAssessment } from "@/types/agriculture";
import type { ActivitySuitabilityReport } from "@/types/activity";
import type { VoiceAssistantReport, VoiceBriefingScript, VoiceLanguage } from "@/types/voice";
import { generateDeterministicHash } from "@/lib/deduplicator";

export class VoiceService {
  /**
   * Cleans raw text or markdown so it sounds natural when vocalized by SpeechSynthesis.
   * Expands abbreviations, eliminates markdown artifacts, tables, and emojis.
   */
  cleanForSpeech(rawText: string): string {
    if (!rawText) return "";

    let text = rawText;

    // 1. Remove markdown links, keep text: [Anchor](url) -> Anchor
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // 2. Remove code blocks and inline backticks
    text = text.replace(/```[\s\S]*?```/g, " ");
    text = text.replace(/`([^`]+)`/g, "$1");

    // 3. Remove markdown headers, bold, italics, strikethrough
    text = text.replace(/^#+\s+/gm, "");
    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
    text = text.replace(/(\*|_)(.*?)\1/g, "$2");
    text = text.replace(/~~(.*?)~~/g, "$1");

    // 4. Remove blockquotes and list bullets
    text = text.replace(/^\s*>\s*/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");

    // 5. Remove HTML tags
    text = text.replace(/<[^>]*>/g, " ");

    // 6. Remove common weather/card emojis and icons
    text = text.replace(
      /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu,
      ""
    );

    // 7. Expand meteorological abbreviations and units
    text = text.replace(/\b(\d+)\s*°\s*C\b/gi, "$1 degrees Celsius");
    text = text.replace(/°\s*C\b/gi, " degrees Celsius");
    text = text.replace(/\b(\d+)\s*°\s*F\b/gi, "$1 degrees Fahrenheit");
    text = text.replace(/°\s*F\b/gi, " degrees Fahrenheit");
    text = text.replace(/\b(\d+(?:\.\d+)?)\s*km\/h\b/gi, "$1 kilometers per hour");
    text = text.replace(/\b(\d+(?:\.\d+)?)\s*mph\b/gi, "$1 miles per hour");
    text = text.replace(/\b(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 millimeters");
    text = text.replace(/\b(\d+)\s*hPa\b/gi, "$1 hectopascals");
    text = text.replace(/\b(\d+(?:\.\d+)?)\s*%/g, "$1 percent");

    // 8. Collapse whitespace and clean punctuation
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\n\s*\n/g, ". ");
    text = text.replace(/\n/g, " ");
    text = text.replace(/\s+([.,!?;:])/g, "$1");
    text = text.replace(/\.{2,}/g, ".");
    text = text.trim();

    return text;
  }

  /**
   * Detects if the given text or query is in Hindi or Hinglish.
   */
  detectLanguage(text: string): VoiceLanguage {
    if (!text) return "en-US";

    // Devanagari script range
    if (/[\u0900-\u097F]/.test(text)) {
      return "hi-IN";
    }

    // Common Hinglish weather terms
    const hinglishPattern = /\b(mausam|kaisa|kya|hai|baarish|barish|aaj|kal|parso|garmi|sardi|bataiye|hoga|karein|chahiye)\b/i;
    if (hinglishPattern.test(text)) {
      return "hi-IN";
    }

    return "en-US";
  }

  /**
   * Computes speaking metrics (word count and estimated speaking duration in seconds).
   * Assumes a natural conversational cadence of ~140 words per minute (~2.33 words/sec).
   */
  computeScriptMetrics(cleanedText: string, language: VoiceLanguage): VoiceBriefingScript {
    const words = cleanedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    // Base speaking rate: ~140 words per minute -> 60 / 140 = ~0.43 seconds per word
    const wordsPerSecond = 2.3;
    const estimatedDurationSeconds = Math.max(1, Math.round((wordCount / wordsPerSecond) * 10) / 10);

    return {
      text: cleanedText,
      cleanedForSpeech: cleanedText,
      language,
      estimatedDurationSeconds,
      wordCount,
    };
  }

  /**
   * Generates a complete voice briefing report from verified weather snapshot and intelligence modules.
   */
  generateVoiceBriefing(options: {
    weather: WeatherSnapshot;
    riskReport?: WeatherRiskReport;
    agriculture?: AgricultureAssessment;
    activity?: ActivitySuitabilityReport;
    language?: VoiceLanguage;
  }): VoiceAssistantReport {
    const { weather, riskReport, agriculture, activity } = options;
    const locName = weather.location.name;
    const current = weather.current;
    const lang = options.language || "en-US";

    const parts: string[] = [];
    const highlights: string[] = [];

    if (lang === "hi-IN") {
      // Hindi / Hinglish briefing
      parts.push(`${locName} mein abhi taapman ${Math.round(current.temperature)} degrees Celsius hai, aur mausam ${current.description || current.condition} hai.`);
      highlights.push(`Taapman: ${Math.round(current.temperature)}°C (${current.description})`);

      if (current.precipitationProbability && current.precipitationProbability > 30) {
        parts.push(`Aaj baarish ki sambhavna lagbhag ${current.precipitationProbability} percent hai.`);
        highlights.push(`Baarish sambhavna: ${current.precipitationProbability}%`);
      }

      if (riskReport && riskReport.overallSeverity !== "low") {
        parts.push(`Mausam alert: ${riskReport.overallSeverity} severity ka risk note kiya gaya hai.`);
        highlights.push(`Mausam Risk: ${riskReport.overallSeverity.toUpperCase()}`);
      }

      if (activity) {
        const reqAct = activity.requestedActivity || "running_cycling";
        const dailyAct = activity.activities[reqAct];
        if (dailyAct) {
          parts.push(`Outdoor activities ke liye halat ${dailyAct.overallSafetyLevel} hai. ${dailyAct.recommendation}`);
          highlights.push(`Activity: ${dailyAct.activityName} (${dailyAct.overallSafetyLevel.toUpperCase()})`);
        }
      }
    } else {
      // English briefing
      parts.push(
        `In ${locName}, it is currently ${Math.round(current.temperature)} degrees Celsius with ${current.description || current.condition}.`
      );
      highlights.push(`${Math.round(current.temperature)}°C — ${current.description || current.condition}`);

      if (current.feelsLike && Math.abs(current.feelsLike - current.temperature) >= 2) {
        parts.push(`It feels like ${Math.round(current.feelsLike)} degrees Celsius.`);
      }

      if (current.precipitationProbability && current.precipitationProbability >= 20) {
        parts.push(`Precipitation probability is ${current.precipitationProbability} percent.`);
        highlights.push(`Rain probability: ${current.precipitationProbability}%`);
      }

      if (current.windSpeed >= 20) {
        parts.push(`Wind speed is elevated at ${Math.round(current.windSpeed)} kilometers per hour.`);
        highlights.push(`Wind: ${Math.round(current.windSpeed)} km/h`);
      }

      if (riskReport && riskReport.overallSeverity !== "low") {
        const top = riskReport.assessments.find((a) => a.severity === "high" || a.severity === "extreme");
        if (top) {
          parts.push(`Weather risk advisory: elevated ${top.type.replace(/_/g, " ")} risk is detected.`);
          highlights.push(`Risk Alert: ${top.type.replace(/_/g, " ")} (${top.severity})`);
        }
      }

      if (activity) {
        const reqAct = activity.requestedActivity || "running_cycling";
        const dailyAct = activity.activities[reqAct];
        if (dailyAct) {
          parts.push(`Activity advisory for ${dailyAct.activityName}: conditions are ${dailyAct.overallSafetyLevel}. ${dailyAct.recommendation}`);
          highlights.push(`Activity: ${dailyAct.activityName} (${dailyAct.overallSafetyLevel})`);
        }
      }

      if (agriculture && agriculture.cropDisplayName) {
        parts.push(`Agricultural status for ${agriculture.cropDisplayName}: ${agriculture.overallRiskLevel} risk.`);
        highlights.push(`Crop: ${agriculture.cropDisplayName} (${agriculture.overallRiskLevel} risk)`);
      }
    }

    const rawBriefingText = parts.join(" ");
    const cleanedScript = this.cleanForSpeech(rawBriefingText);
    const spokenScript = this.computeScriptMetrics(cleanedScript, lang);

    const headline = `${locName} Audio Briefing: ${Math.round(current.temperature)}°C, ${current.condition}`;
    const hash = generateDeterministicHash(`${weather.location.name}_${weather.observedAt}_${lang}_voice`);

    return {
      id: `voice_${hash}`,
      location: {
        name: weather.location.name,
        coordinates: weather.location.coordinates,
      },
      headline,
      spokenScript,
      highlights: highlights.slice(0, 5),
      suggestedVoicePrompts: [
        "Is it safe to go outside right now?",
        "What is the rain forecast for tomorrow?",
        "Check road travel conditions",
        "Give me the farming advisory",
      ],
      generatedAt: weather.observedAt,
    };
  }

  /**
   * Generates a voice briefing report from arbitrary text (e.g. Copilot answers).
   */
  generateBriefingFromText(options: {
    text: string;
    locationName: string;
    coordinates?: { latitude: number; longitude: number };
    language?: VoiceLanguage;
    highlights?: string[];
  }): VoiceAssistantReport {
    const lang = options.language || this.detectLanguage(options.text);
    const cleaned = this.cleanForSpeech(options.text);
    const spokenScript = this.computeScriptMetrics(cleaned, lang);
    const hash = generateDeterministicHash(`${options.locationName}_${spokenScript.text.slice(0, 30)}_${lang}`);

    return {
      id: `voice_${hash}`,
      location: {
        name: options.locationName,
        coordinates: options.coordinates,
      },
      headline: `${options.locationName} Voice Briefing`,
      spokenScript,
      highlights: options.highlights || [options.text.slice(0, 80)],
      suggestedVoicePrompts: [
        "Is it safe to go outside right now?",
        "What is the rain forecast for tomorrow?",
        "Check road travel conditions",
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const globalVoiceService = new VoiceService();
