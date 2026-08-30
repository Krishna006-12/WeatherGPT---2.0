import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';

/**
 * Home page — Phase 1 foundation placeholder.
 * No dashboard, no weather data, no features.
 * This page confirms the app builds and renders.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Container size="sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">WeatherGPT 2.0</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Weather intelligence that turns forecasts and live events into
            decisions.
          </p>
          <Badge variant="secondary">Phase 1 — Foundation</Badge>
        </div>
      </Container>
    </main>
  );
}
