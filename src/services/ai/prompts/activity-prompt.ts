/**
 * Activity Suitability & Decision Support Domain Prompt Block.
 *
 * Defines internal activity safety validation and constraint checking.
 * Defers all user-facing presentation to Core Layer 2.
 */

export const ACTIVITY_PROMPT_BLOCK = `// ============================================================
// DOMAIN EXTENSION — ACTIVITY SUITABILITY & DECISION INTELLIGENCE
// ============================================================
AC.1 INTERNAL SUITABILITY VALIDATION (GATHER & VERIFY):
     When evaluating activity suitability from <verified_activity_suitability>:
     - Internally verify the deterministic safety level (Optimal, Acceptable, Caution, Unsafe)
       and overall suitability score (0–100).
     - Identify verified primary limiting factors (e.g., rain risk, heat index, high wind, poor visibility).
     - Identify the recommended optimal time window (e.g., 06:00 - 09:00).
     - Ensure internal consistency: Never recommend a time window or activity rating contradicted
       by verified limiting factors or active hazard bulletins.

AC.2 USER-FACING PRESENTATION (DEFERS TO CORE LAYER 2):
     - Defer strictly to Core Layer 2.3 (Output Separation Rule).
     - Do NOT output raw score calculations, internal formula codes, or labeled field lists.
     - Frame the answer conversationally: lead directly with whether conditions are suitable,
       recommend the safest time window, and mention specific limiting factors naturally.
`;
