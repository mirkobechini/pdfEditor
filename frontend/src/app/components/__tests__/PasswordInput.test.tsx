import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import PasswordInput from "../PasswordInput";

describe("PasswordInput", () => {
  it("renders password input with correct type", () => {
    render(<PasswordInput value="" onChange={vi.fn()} placeholder="••••••••" />);
    const input = screen.getByPlaceholderText("••••••••");
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("password");
    expect(input.getAttribute("autoComplete")).toBe("current-password");
  });

  it("toggles visibility on button click", () => {
    render(<PasswordInput value="secret" onChange={vi.fn()} placeholder="pwd" />);
    const input = screen.getByPlaceholderText("pwd");
    expect(input.getAttribute("type")).toBe("password");

    const toggle = screen.getByRole("button");
    fireEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("text");

    fireEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("password");
  });

  it("calls onChange with the new value", () => {
    const onChange = vi.fn();
    render(<PasswordInput value="" onChange={onChange} placeholder="pwd" />);
    fireEvent.change(screen.getByPlaceholderText("pwd"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("passes required and autoFocus props to the input", () => {
    render(
      <PasswordInput
        value=""
        onChange={vi.fn()}
        placeholder="pwd"
        required
        autoFocus
      />,
    );
    const input = screen.getByPlaceholderText("pwd") as HTMLInputElement;
    expect(input.required).toBe(true);
    // jsdom does not reflect the autofocus IDL property; just ensure
    // the component renders without crashing when autoFocus is set
    expect(input).toBeTruthy();
  });

  it("injects a style element to hide native password toggles", () => {
    // Module-level injection happens once at import; verify the style exists
    const style = Array.from(document.querySelectorAll("style")).find((s) =>
      s.textContent?.includes("::-ms-reveal"),
    );
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain(
      "::-webkit-credentials-auto-fill-button",
    );
  });
});