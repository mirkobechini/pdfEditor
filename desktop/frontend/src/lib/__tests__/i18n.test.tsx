import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useLocaleSetter } from "../i18n";

// Mock message files
vi.mock("../../messages/en.json", () => ({ test: "Hello" }));
vi.mock("../../messages/it.json", () => ({ test: "Ciao" }));

function TestConsumer() {
  const setLocale = useLocaleSetter();
  return (
    <div>
      <button onClick={() => setLocale("en")}>Set EN</button>
      <button onClick={() => setLocale("it")}>Set IT</button>
    </div>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => localStorage.clear());

  it("renders children", () => {
    render(<I18nProvider><div>Child</div></I18nProvider>);
    expect(screen.getByText("Child")).toBeInTheDocument();
  });

  it("provides locale setter function", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByText("Set EN")).toBeInTheDocument();
    expect(screen.getByText("Set IT")).toBeInTheDocument();
  });

  it("persists locale to localStorage", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    fireEvent.click(screen.getByText("Set EN"));
    expect(localStorage.getItem("locale")).toBe("en");
    fireEvent.click(screen.getByText("Set IT"));
    expect(localStorage.getItem("locale")).toBe("it");
  });
});
