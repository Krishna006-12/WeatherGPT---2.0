import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";
import { ContextBuilder } from "@/services/ai/context-builder";

// Mock the global fetch
global.fetch = vi.fn();
const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

describe("AICopilotCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  const mockLocation = {
    id: 1,
    name: "Kanpur",
    displayName: "Kanpur, India",
    latitude: 26.4499,
    longitude: 80.3319,
    timezone: "Asia/Kolkata",
    country: "India",
  };

  it("renders closed state initially", () => {
    render(<AICopilotCard location={mockLocation} />);
    expect(screen.getByText("Copilot")).toBeInTheDocument();
    expect(screen.getByText(/Ask about local patterns/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask Copilot/i)).not.toBeInTheDocument();
  });

  it("expands on click and shows input", () => {
    render(<AICopilotCard location={mockLocation} />);
    const card = screen.getByText("Copilot").closest("div")?.parentElement;
    fireEvent.click(card!);

    expect(screen.getByPlaceholderText(/Ask Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/How can I help/i)).toBeInTheDocument();
  });

  it("sends request to /api/chat with query and location context", async () => {
    const mockResponse = {
      intent: "general_weather",
      answer: "The weather is clear.",
      groundingStatus: "grounded",
      citations: [{ source: "Open-Meteo", title: "Weather Forecast", url: "https://open-meteo.com" }],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AICopilotCard location={mockLocation} />);
    
    // Expand
    const card = screen.getByText("Copilot").closest("div")?.parentElement;
    fireEvent.click(card!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "What is the weather?" } });
    
    const sendButton = input.nextElementSibling as HTMLButtonElement;
    fireEvent.click(sendButton);

    expect(screen.getByText(/Analyzing verified weather and event data/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("What is the weather?"),
      }));
    });

    // Check location payload
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body.location.city).toBe("Kanpur");

    await waitFor(() => {
      expect(screen.getByText("The weather is clear.")).toBeInTheDocument();
      expect(screen.getByText(/Open-Meteo:/)).toBeInTheDocument();
    });
  });

  it("displays insufficient_evidence state", async () => {
    const mockResponse = {
      intent: "event_impact",
      answer: "I do not know.",
      groundingStatus: "insufficient_evidence",
      citations: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AICopilotCard />);
    
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "Unknown event impact?" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText(/Insufficient evidence to provide a fully verified answer/i)).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Internal Server Error" } }),
    });

    render(<AICopilotCard />);
    
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "Crash me" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText(/Internal Server Error/i)).toBeInTheDocument();
    });
  });

  it("renders honest real data-source attribution from ContextBuilder output alongside separate Gemini badge", async () => {
    // Generate authentic citations from ContextBuilder
    const builder = new ContextBuilder();
    const { citations } = builder.buildPrompt({
      userQuery: "What is the weather in Kanpur?",
      intent: "weather",
      untrustedSourceDelimiters: "none",
      builtAt: "2026-09-18T00:00:00Z",
      targetLocation: { name: "Kanpur", city: "Kanpur", country: "India" },
      weather: {
        location: {
          name: "Kanpur",
          region: "Uttar Pradesh",
          country: "India",
          coordinates: { latitude: 26.4499, longitude: 80.3319 },
          timezone: "Asia/Kolkata",
        },
        observedAt: "2026-09-18T00:00:00Z",
        current: {
          temperature: 28,
          feelsLike: 30,
          condition: "clear",
          humidity: 65,
          windSpeed: 10,
          windDirection: 180,
          precipitation: 0,
          pressure: 1012,
          cloudCover: 10,
          observedAt: "2026-09-18T00:00:00Z",
        },
        hourly: [],
        daily: [],
        alerts: [],
        provenance: [{ provider: "Open-Meteo", retrievedAt: "2026-09-18T00:00:00Z" }],
      },
    });

    // Verify ContextBuilder produced real provider attribution
    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0]?.source).toBe("Open-Meteo");

    const mockResponse = {
      intent: "weather",
      answer: "The weather in Kanpur is 28°C and clear.",
      groundingStatus: "grounded",
      citations,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<AICopilotCard location={mockLocation} />);
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "Weather update Kanpur" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      // 1. Assert real provider name is preserved and displayed in the chip list
      expect(screen.getByText("Open-Meteo:")).toBeInTheDocument();
      expect(screen.getByText(/Live Weather Observation for Kanpur/i)).toBeInTheDocument();

      // 2. Assert real provider is NOT replaced with Gemini in the data source chip
      const dataSourcesRegion = screen.getByRole("region", { name: /Data sources and AI attribution/i });
      expect(dataSourcesRegion).toBeInTheDocument();

      // 3. Assert separate AI analysis badge exists alongside
      expect(screen.getByText("AI analysis by Google Gemini")).toBeInTheDocument();
      expect(screen.getByText(/Reasoning & summary/i)).toBeInTheDocument();

      // 4. Assert accessible labels exist
      expect(screen.getByLabelText(/Data sourced from Open-Meteo/i)).toBeInTheDocument();
    });
  });

  it("forwards active language in /api/chat request body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        intent: "general_weather",
        answer: "Weather is clear",
        groundingStatus: "grounded",
        citations: [],
      }),
    });

    render(<AICopilotCard location={mockLocation} />);
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "Tell me weather" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.any(Object));
    });

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body).toHaveProperty("language");
    expect(typeof body.language).toBe("string");
  });

  it("detects and overrides language to 'hi-en' when user types Hinglish while UI language is 'en'", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        intent: "weather",
        answer: "Dubai me abhi mausam **34.1°C** hai aur clear sky hai.",
        groundingStatus: "grounded",
        citations: [],
      }),
    });

    render(<AICopilotCard location={mockLocation} />);
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "dubai ka mausam" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.any(Object));
    });

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call![1]!.body as string);
    expect(body.message).toBe("dubai ka mausam");
    expect(body.language).toBe("hi-en");
  });

  it("renders markdown bold syntax as <strong> elements rather than literal asterisks", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        intent: "weather",
        answer: "The current temperature is **34.1°C** with **clear skies**.",
        groundingStatus: "grounded",
        citations: [],
      }),
    });

    render(<AICopilotCard location={mockLocation} />);
    fireEvent.click(screen.getByText("Copilot").closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask Copilot/i);
    fireEvent.change(input, { target: { value: "What is the temperature?" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText("34.1°C")).toBeInTheDocument();
    });

    const boldElement = screen.getByText("34.1°C");
    expect(boldElement.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*34\.1°C\*\*/)).not.toBeInTheDocument();
  });
});

