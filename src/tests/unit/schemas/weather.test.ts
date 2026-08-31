import { describe, it, expect } from 'vitest';
import { weatherSnapshotSchema } from '@/schemas/weather';

/**
 * Weather schema validation tests.
 * Proves that Zod validation works correctly at the data boundary.
 */
describe('weatherSnapshotSchema', () => {
  const validSnapshot = {
    location: {
      name: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
      coordinates: { latitude: 19.076, longitude: 72.8777 },
      timezone: 'Asia/Kolkata',
    },
    observedAt: '2024-01-15T10:30:00Z',
    current: {
      temperature: 28.5,
      feelsLike: 31.2,
      humidity: 72,
      precipitation: 0,
      windSpeed: 12.5,
      windDirection: 220,
      pressure: 1013,
      cloudCover: 50,
      condition: 'partly-cloudy' as const,
      observedAt: '2024-01-15T10:30:00Z',
    },
    hourly: [
      {
        time: '2024-01-15T11:00:00Z',
        temperature: 29,
        precipitation: 0,
        feelsLike: 32,
        humidity: 70,
        windSpeed: 13,
        condition: 'partly-cloudy' as const,
        precipitationProbability: 20,
      },
    ],
    daily: [
      {
        date: '2024-01-15T00:00:00Z',
        temperatureHigh: 32,
        temperatureLow: 22,
        humidity: 65,
        windSpeed: 15,
        condition: 'partly-cloudy' as const,
        precipitationProbability: 30,
        precipitationSum: 0,
        sunrise: '2024-01-15T07:10:00Z',
        sunset: '2024-01-15T18:05:00Z',
      },
    ],
    alerts: [],
    provenance: [
      {
        provider: 'test-provider',
        retrievedAt: '2024-01-15T10:30:00Z',
      },
    ],
  };

  it('accepts valid weather data', () => {
    const result = weatherSnapshotSchema.safeParse(validSnapshot);
    expect(result.success).toBe(true);
  });

  it('rejects data with missing required fields', () => {
    const invalid = { ...validSnapshot, location: undefined };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid coordinate ranges', () => {
    const invalid = {
      ...validSnapshot,
      location: {
        ...validSnapshot.location,
        coordinates: { latitude: 200, longitude: 72.8777 },
      },
    };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects humidity outside 0-100 range', () => {
    const invalid = {
      ...validSnapshot,
      current: { ...validSnapshot.current, humidity: 150 },
    };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid weather condition values', () => {
    const invalid = {
      ...validSnapshot,
      current: { ...validSnapshot.current, condition: 'blizzard' },
    };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires at least one provenance entry', () => {
    const invalid = { ...validSnapshot, provenance: [] };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO datetime strings', () => {
    const invalid = {
      ...validSnapshot,
      observedAt: 'not-a-date',
    };
    const result = weatherSnapshotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
