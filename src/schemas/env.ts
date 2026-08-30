/**
 * Environment variable validation schema.
 * Validates server-side environment at startup.
 * No real API keys are required during Phase 1.
 */

import { z } from 'zod';

/**
 * Server-side environment variables.
 * All API keys are optional in Phase 1 — they become
 * required when their respective services are implemented.
 */
export const serverEnvSchema = z.object({
  // Weather provider
  WEATHER_API_KEY: z.string().min(1).optional(),

  // News provider
  NEWS_API_KEY: z.string().min(1).optional(),

  // AI provider
  AI_API_KEY: z.string().min(1).optional(),

  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Client-side (public) environment variables.
 * These are safe to expose in the browser.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
