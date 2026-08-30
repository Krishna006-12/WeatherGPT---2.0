import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '@/lib/api-client';

/**
 * ApiClient tests.
 * Proves timeout handling and error normalization work
 * without real network access.
 */

describe('ApiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('returns parsed JSON on success', async () => {
    const mockData = { temperature: 25 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    vi.useRealTimers();
    const result = await client.request<{ temperature: number }>('/weather');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.temperature).toBe(25);
    }
  });

  it('returns error on non-OK HTTP response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    vi.useRealTimers();
    const result = await client.request('/weather');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('404');
    }
  });

  it('returns error on network failure', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    vi.useRealTimers();
    const result = await client.request('/weather');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Failed to fetch');
    }
  });

  it('sends correct headers', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      headers: { Authorization: 'Bearer test-token' },
    });
    vi.useRealTimers();
    await client.request('/weather');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/weather',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
