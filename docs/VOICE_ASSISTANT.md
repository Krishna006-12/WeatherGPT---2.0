# Phase 12: Voice Assistant & Speech Intelligence

WeatherGPT 2.0 incorporates natural voice querying, multi-lingual speech recognition, and deterministic spoken meteorological briefings.

---

## 1. Architecture Overview

```
User Voice Input (Microphone)
           │
           ▼
Browser SpeechRecognition (Web Speech API)
           │
           ▼ Natural Language Transcript
IntentRouter.classify()  ───►  isVoiceQuery: true
           │
           ▼
AI Orchestrator Execution Pipeline
   ├── Tool Execution (WeatherSnapshot, RiskReport, ActivitySuitability, Agriculture)
   ├── Grounded Context Construction (Rule 13 Voice Prompt Guidance)
   ├── Gemini LLM Completion / Deterministic Fallback
   └── VoiceService.generateVoiceBriefing()
           │
           ▼ Cleaned Spoken Script + Metrics (Duration, Word Count)
AIResponse.voice (VoiceAssistantReport)
           │
           ▼
Browser SpeechSynthesis (TTS Vocalization)
```

---

## 2. Speech Normalization & Cleaning Engine

Meteorological descriptions and AI completions frequently contain abbreviations, symbols, markdown elements, and emojis that sound disjointed or robotic when read aloud by standard screen readers or Text-to-Speech engines.

`VoiceService.cleanForSpeech()` deterministically normalizes these into fluent spoken phrasing:

| Raw Meteorological Representation | Normalized Spoken Phrasing |
| :--- | :--- |
| `24°C` / `24 °C` | `24 degrees Celsius` |
| `75°F` | `75 degrees Fahrenheit` |
| `25 km/h` | `25 kilometers per hour` |
| `12.5 mm` | `12.5 millimeters` |
| `1013 hPa` | `1013 hectopascals` |
| `80%` | `80 percent` |
| `**Severe Warning**` | `Severe Warning` (bold markup stripped) |
| `# Weather Alert` | `Weather Alert` (header markup stripped) |
| `⛈️ / ☀️ / 🌧️` | Emojis stripped to avoid TTS reading emoji Unicode names |

---

## 3. Language Detection & Locales

- **`en-US`**: Standard English meteorological briefings.
- **`hi-IN`**: Native Devanagari script and Hinglish phrasing (e.g., *"Kanpur mein kal mausam kaisa rahega?"*, *"Kya aaj baarish hogi?"*, *"Delhi mausam sunao"*).
- Auto-detects input language from query text and generates culturally and linguistically appropriate spoken scripts.

---

## 4. API Endpoints

### `POST /api/voice`

Generates structured spoken briefings for specified geographic coordinates or cleans custom text for speech synthesis.

#### Request Payload
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timezone": "Asia/Kolkata",
  "language": "en-US",
  "textToSpeak": "Optional custom text to normalize"
}
```

#### Response Envelope
```json
{
  "success": true,
  "data": {
    "id": "voice_a8f9c2d1",
    "location": {
      "name": "New Delhi",
      "coordinates": { "latitude": 28.6139, "longitude": 77.2090 }
    },
    "headline": "New Delhi Audio Briefing: 32°C, Partly Cloudy",
    "spokenScript": {
      "text": "In New Delhi, it is currently 32 degrees Celsius with partly cloudy skies...",
      "cleanedForSpeech": "In New Delhi, it is currently 32 degrees Celsius with partly cloudy skies...",
      "language": "en-US",
      "estimatedDurationSeconds": 14.2,
      "wordCount": 33
    },
    "highlights": [
      "32°C — Partly Cloudy",
      "Rain probability: 15%",
      "Wind: 18 km/h"
    ],
    "suggestedVoicePrompts": [
      "Is it safe to go outside right now?",
      "What is the rain forecast for tomorrow?",
      "Check road travel conditions",
      "Give me the farming advisory"
    ],
    "generatedAt": "2026-09-13T10:00:00.000Z"
  }
}
```

### `GET /api/voice`

Returns operational status, supported locales, and suggested voice prompts for client discovery.

---

## 5. UI Integration

- **Microphone Action**: Integrated into `AICopilotCard` input bar. Features pulse listening state, interim transcript preview, and automatic submission upon speech finalization.
- **Listen / Stop Audio Button**: Integrated into every assistant message card, allowing users to vocalize answers on demand with browser-native `SpeechSynthesis`.
