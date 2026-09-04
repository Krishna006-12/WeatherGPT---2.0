import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AICopilotCard } from "@/components/chat/ai-copilot-card";

// Mock the global fetch
global.fetch = vi.fn();
const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

describe("AICopilotCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
    expect(screen.getByText(/WeatherGPT Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyzing verified weather and event data/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask WeatherGPT/i)).not.toBeInTheDocument();
  });

  it("expands on click and shows input", () => {
    render(<AICopilotCard location={mockLocation} />);
    const card = screen.getByText(/WeatherGPT Copilot/i).closest("div")?.parentElement;
    fireEvent.click(card!);

    expect(screen.getByPlaceholderText(/Ask WeatherGPT/i)).toBeInTheDocument();
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
    const card = screen.getByText(/WeatherGPT Copilot/i).closest("div")?.parentElement;
    fireEvent.click(card!);

    const input = screen.getByPlaceholderText(/Ask WeatherGPT/i);
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
    
    fireEvent.click(screen.getByText(/WeatherGPT Copilot/i).closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask WeatherGPT/i);
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
    
    fireEvent.click(screen.getByText(/WeatherGPT Copilot/i).closest("div")?.parentElement!);

    const input = screen.getByPlaceholderText(/Ask WeatherGPT/i);
    fireEvent.change(input, { target: { value: "Crash me" } });
    fireEvent.click(input.nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText(/Internal Server Error/i)).toBeInTheDocument();
    });
  });
});

