"use client";

import React from "react";

/**
 * Icona di stato cloud per un PDF, come sul mobile:
 * - synced   → nuvola con check (verde)
 * - pending  → nuvola con frecce di sync (giallo)
 * - error    → nuvola con "!" (rosso)
 * - excluded → nuvola barrata (grigio) — escluso dalla sincronizzazione (#990)
 * - none     → nuvola vuota (grigio) — non sincronizzato
 */
export type CloudIconState =
  | "synced"
  | "pending"
  | "error"
  | "excluded"
  | "none";

const COLORS: Record<CloudIconState, string> = {
  synced: "#3ec35f",
  pending: "#e0b23c",
  error: "#e05a5a",
  excluded: "#7e7267",
  none: "#7e7267",
};

const CLOUD_PATH =
  "M7 18h9a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.2 11.6 3.5 3.5 0 0 0 7 18z";

export default function CloudStatusIcon({
  state,
  size = 14,
  title,
}: {
  state: CloudIconState;
  size?: number;
  title?: string;
}) {
  const color = COLORS[state];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={state}
      role="img"
    >
      {title && <title>{title}</title>}
      <path d={CLOUD_PATH} />
      {state === "synced" && <path d="M9.6 13.9l1.7 1.7 3.1-3.4" />}
      {state === "error" && <path d="M12.5 11.6v3.1M12.5 16.7h.01" />}
      {state === "pending" && (
        <>
          <path d="M9.9 13.4a2.6 2.6 0 0 1 4.4-1.1" />
          <path d="M14.6 10.6l.3 2-2-.2" />
        </>
      )}
      {state === "excluded" && <path d="M4.5 4.5l15 15" />}
    </svg>
  );
}
