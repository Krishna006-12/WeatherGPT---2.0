/**
 * Server-side environment configuration loader.
 *
 * Validates environment variables through Zod at import time.
 * If required variables are missing when a service needs them,
 * this module provides safe accessors that throw clear errors.
 *
 * IMPORTANT: This module must only be imported in server-side code.
 * Never import it from client components.
 */

import { serverEnvSchema, type ServerEnv } from '@/schemas/env';

function loadServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      'Invalid server environment configuration:',
      result.error.flatten().fieldErrors
    );
    throw new Error('Invalid server environment configuration');
  }

  return result.data;
}

/**
 * Validated server environment.
 * Access individual keys from this object.
 */
export const serverEnv = loadServerEnv();

/**
 * Require a specific env key at runtime.
 * Throws with a clear message if the key is not set.
 * Use this for API keys that are optional in Phase 1
 * but required when their service is activated.
 */
export function requireEnv(key: keyof ServerEnv): string {
  const value = serverEnv[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        'See .env.example for required configuration.'
    );
  }
  return value;
}
