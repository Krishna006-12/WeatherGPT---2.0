import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LanguageProvider } from "@/context/language-context";

describe("LanguageSwitcher Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("renders all three supported UI language options", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ਪੰਜਾਬੀ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hinglish" })).not.toBeInTheDocument();
  });

  it("switches language to Hindi when 'हिं' button is clicked", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    const hiButton = screen.getByRole("button", { name: "हिंदी" });
    expect(hiButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(hiButton);

    expect(hiButton).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("hi");
    expect(localStorage.getItem("weathergpt_user_language")).toBe("hi");
  });
});
