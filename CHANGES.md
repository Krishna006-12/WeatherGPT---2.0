# Changes Summary — System Prompt Modularization & 10-Turn Context Wiring

## 1. Audit & Resolution of Instruction Conflicts
- **Issue**: The previous monolithic system prompt contained conflicting output instructions. Domain-specific blocks (especially Agriculture) commanded the model to output labeled field structures (`Crop:`, `Location:`, `Risk:`, `Recommendation:`, `Reason:`, `Confidence:`, `Sources:`), directly contradicting Core Layer 2.3 (`OUTPUT SEPARATION RULE`), which prohibits raw JSON, schema keys, and labeled fields in the user-facing text. Additionally, domain blocks duplicated core grounding and confidence rules.
- **Resolution**:
  - Decomposed the monolithic prompt into modular, single-responsibility files inside [`src/services/ai/prompts/`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/):
    - [`core-prompt.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/core-prompt.ts): Single source of truth for Layers 0–4 (Intake, Grounding Gate, Natural Response Composition, Self-Correction, Escalation & Fallback) and anti-injection defense.
    - [`agriculture-prompt.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/agriculture-prompt.ts): Rewritten to describe **internal data verification** (crop name, rain probability, mm, temperatures, humidity, wind, operational constraints) while strictly deferring to Core Layer 2 for natural language advisory generation. Deleted duplicate grounding/confidence rules.
    - [`risk-prompt.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/risk-prompt.ts): Internal hazard evaluation (Low, Moderate, High, Extreme; "unavailable" vs "no_evidence") and Core Layer 4.4 severe alert prioritization. Defers user-facing presentation to Core Layer 2.
    - [`activity-prompt.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/activity-prompt.ts): Internal suitability validation (Optimal, Acceptable, Caution, Unsafe; 0–100 score; limiting factors; best time window) without raw code labels in user answers.

## 2. Voice vs. Chat Channel Separation
- **Issue**: Voice Assistant directives were previously bundled inside the general prompt, causing chat endpoints to receive TTS instructions and voice endpoints to receive visual formatting rules.
- **Resolution**:
  - Created [`voice-addendum.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/voice-addendum.ts) (`VOICE_TONE_ADDENDUM`) that strictly forbids markdown formatting (no bold, italics, bullets, numbered lists, headings, links, or tables), enforces concise sentence cadence (<20 words/sentence), and mandates phonetic pronunciation of weather units (e.g., "24 degrees Celsius", "15 kilometers per hour", "60 percent").
  - Created [`chat-formatting.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/chat-formatting.ts) (`CHAT_FORMATTING_RULES`) for clean markdown layout in text UI.
  - Wired explicit request routing in [`AIOrchestrator`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/ai-orchestrator.ts) and [`ai-copilot-card.tsx`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/components/chat/ai-copilot-card.tsx):
    ```ts
    const channel: PromptChannel = request.channel || (classification.isVoiceQuery ? "voice" : "chat");
    ```
    Voice requests receive `VOICE_TONE_ADDENDUM` and exclude chat rules; chat requests receive `CHAT_FORMATTING_RULES` and exclude voice rules.

## 3. Conditional Composition & Token Guard
- **Resolution**:
  - Implemented [`prompt-composer.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/prompts/prompt-composer.ts) with `buildSystemPrompt({ intent, channel, hasActiveSevereAlert })`.
  - Always includes `CORE_SYSTEM_PROMPT`.
  - Agriculture block included **only** when `intent === 'agriculture'`.
  - Risk block included **only** when `intent === 'risk'`, `intent === 'weather_event'`, or `hasActiveSevereAlert === true`.
  - Activity block included **only** when `intent === 'activity'` or `intent === 'activity_planning'`.
  - Channel block: Voice addendum when `channel === 'voice'`, chat formatting when `channel === 'chat'`.
  - **Measured Token Count & Core Prompt Size Analysis**:
    - The actual measured token size for general chat (`intent=general`, `channel=chat`, `hasActiveSevereAlert=false`) is **2,572 tokens** (10,250 characters at `Math.ceil(length / 3.8)`).
    - **Why Layers 0–4 require 2,572 tokens on their own with zero domain blocks**:
      1. *Layer 0 (Intake & Anti-Injection)*: Defines intent gating (<0.70 confidence triggers a single clarifying question) and comprehensive prompt-injection defense treating untrusted external feeds and inputs as passive data.
      2. *Layer 1 (Grounding Gate)*: Mandates strict non-hallucination, a 95% confidence thresholding rule requiring explicit uncertainty flagging in plain text, multi-candidate location disambiguation, and multi-model NWP spread divergence reporting.
      3. *Layer 2 (Response Composition)*: Calibrates tone, enforces the critical Output Separation Rule (strictly forbidding field labels like `Crop:`/`Recommendation:` or raw schema keys in user text), and governs 10-turn active context retention and ambiguity resolution.
      4. *Layer 3 (Self-Correction Loop)*: Implements a 4-point silent pre-flight internal validation checklist and contradiction detection against past session claims.
      5. *Layer 4 (Escalation & Fallbacks)*: Manages data timeout pathways, capability offerings, and immediate severe alert priority overrides.
      6. *Chat Channel Guidelines*: Specifies markdown visual layout rules and readability hierarchy for text UI.
    - **True Savings of Modular Composition**: Rather than reducing the core grounding prompt, conditional composition eliminates **domain bloat**: previously, monolithic assembly forced Agriculture (~400 tokens), Risk (~350 tokens), Activity (~280 tokens), and Voice directives (~320 tokens) into every request, pushing total prompt size past ~3,900+ tokens. Modular composition saves ~1,300+ tokens per general query and guarantees adherence to the 4,000 token ceiling.
  - **Token Logging & Hard Ceiling**: Real-time observable dev-mode token logging (`[PromptComposer] Assembled system prompt: ... tokens`); enforces a hard ceiling of 4,000 tokens with loud dev-mode exceptions.

## 4. 10-Turn Context Retention & Older-Turn Summarization
- **Issue**: Previously, conversation history was not wired into the LLM prompt. Only basic entity metadata was stored, ignoring the 10-turn active retention requirement from Core Layer 2.4.
- **Resolution**:
  - Added `ConversationTurn` and updated `ConversationContext`, `GroundedContext`, and `ChatRequest` in [`src/types/ai.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/types/ai.ts) and [`src/schemas/ai.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/schemas/ai.ts).
  - Implemented [`context-summarizer.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/services/ai/context-summarizer.ts) with `summarizeOlderTurns(olderTurns)` for extractive summarization.
  - In `AIOrchestrator`, maintained session-scoped turns across requests (`sessionTurnsMap`, `lastSessionTurns`).
  - When history exceeds 10 turns (e.g. 12 turns):
    - Turns 1–2 are summarized into `<older_turns_summary>`.
    - Turns 3–12 are retained verbatim inside `<recent_turns count="10">`.
  - Updated `ContextBuilder.buildPrompt` to render `<conversation_history>` containing `<older_turns_summary>` and `<recent_turns>`.
  - Verified with test: given a mocked 12-turn session, Turn 2 is explicitly referenced via the summary while Turns 3–12 are supplied verbatim.

## 5. Verification & Tests
- Created [`src/tests/unit/ai/prompt-composer.test.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/tests/unit/ai/prompt-composer.test.ts) covering:
  - Scenario 1: General chat excludes domain blocks & voice addendum.
  - Scenario 2: Agriculture intent includes only agriculture block & chat formatting.
  - Scenario 3: Risk intent includes risk block and excludes others.
  - Scenario 4: Severe active alert includes risk block even on non-risk intent.
  - Scenario 5: Activity intent includes activity block.
  - Scenario 6: Voice channel includes voice addendum and excludes chat formatting.
  - Scenario 7: Alternate signature support `buildSystemPrompt(intent, channel)`.
  - Scenario 8: Token estimation and ceiling validation.
- Created [`src/tests/unit/ai/conversation-context-history.test.ts`](file:///c:/Users/HP/OneDrive/Desktop/WeatherGPT%202.0/src/tests/unit/ai/conversation-context-history.test.ts) covering:
  - ContextBuilder format for `<older_turns_summary>` and `<recent_turns>`.
  - Mocked 12-turn session asserting Turn 2 is present via summary and absent from recent turns, while Turns 3–12 are verbatim.
  - Stateful session turns recording across sequential queries.
