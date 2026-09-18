import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LanguageProvider } from "@/context/language-context";

describe("LanguageSwitcher Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("renders all four supported language options", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ਪੰਜਾਬੀ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hinglish" })).toBeInTheDocument();
  });

  it("switches language to Hinglish when 'Hing' button is clicked", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    const hingButton = screen.getByRole("button", { name: "Hinglish" });
    expect(hingButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(hingButton);

    expect(hingButton).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("hi-en");
    expect(localStorage.getItem("weathergpt_user_language")).toBe("hi-en");
  });
});
