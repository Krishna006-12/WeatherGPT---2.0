import { describe, it, expect } from "vitest";
import { POST, GET } from "@/app/api/chat/route";

describe("POST /api/chat API Route", () => {
  it("returns 200 and AIResponse for valid query", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "What is the weather in Kanpur?",
        location: { name: "Kanpur", lat: 26.4499, lon: 80.3319 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.answer).toBeDefined();
    expect(body.intent).toBe("weather");
    expect(body.groundingStatus).toBeDefined();
    expect(Array.isArray(body.citations)).toBe(true);
  });

  it("returns 400 when message is missing or empty", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: "not a json string",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("GET returns endpoint information", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.endpoint).toBe("/api/chat");
    expect(body.method).toBe("POST");
  });
});
