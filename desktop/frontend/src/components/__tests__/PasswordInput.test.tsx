import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PasswordInput from "../PasswordInput";

describe("PasswordInput", () => {
    const baseProps = {
        value: "",
        onChange: vi.fn(),
        placeholder: "Enter password",
    };

    it("renders with placeholder", () => {
        render(<PasswordInput {...baseProps} />);
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("toggles visibility on eye click", () => {
        render(<PasswordInput {...baseProps} />);
        const input = screen.getByPlaceholderText("Enter password");
        expect(input).toHaveAttribute("type", "password");
        const eyeBtn = screen.getByRole("button");
        fireEvent.click(eyeBtn);
        expect(input).toHaveAttribute("type", "text");
        fireEvent.click(eyeBtn);
        expect(input).toHaveAttribute("type", "password");
    });
});