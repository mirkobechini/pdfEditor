"use client";

import React from "react";

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoFocus?: boolean;
    required?: boolean;
}

export default function PasswordInput({ value, onChange, placeholder, autoFocus, required }: PasswordInputProps) {
    const [show, setShow] = React.useState(false);

    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                required={required}
                className="h-11 w-full rounded-xl border border-white/10 bg-transparent px-4 pr-14 text-sm font-medium text-[#f4f1ee] outline-none transition focus:border-[#f7871f]"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-[#8f8377] hover:text-[#c5baae]"
            >
                {show ? "Nascondi" : "Mostra"}
            </button>
        </div>
    );
}