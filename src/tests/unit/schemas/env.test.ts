import { describe, it, expect } from 'vitest';
import { serverEnvSchema, clientEnvSchema } from '@/schemas/env';

/**
 * Environment configuration validation tests.
 * Proves that env validation behaves safely.
 */
describe('serverEnvSchema', () => {
  it('accepts valid configuration with all keys', () => {
    const result = serverEnvSchema.safeParse({
      WEATHER_API_KEY: 'test-weather-key',
      NEWS_API_KEY: 'test-news-key',
      AI_API_KEY: 'test-ai-key',
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal configuration (all API keys optional in Phase 1)', () => {
    const result = serverEnvSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('defaults NODE_ENV to development', () => {
    const result = serverEnvSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('rejects invalid NODE_ENV values', () => {
    const result = serverEnvSchema.safeParse({ NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });

  it('rejects empty string for API keys when provided', () => {
    const result = serverEnvSchema.safeParse({ WEATHER_API_KEY: '' });
    expect(result.success).toBe(false);
  });
});

describe('clientEnvSchema', () => {
  it('accepts valid public URL', () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: 'https://weathergpt.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty configuration', () => {
    const result = clientEnvSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL format', () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});
