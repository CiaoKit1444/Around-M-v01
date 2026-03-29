/**
 * HighlightText — Highlights search query tokens inside a text string.
 *
 * Splits the `query` on whitespace into tokens, then wraps every occurrence
 * of each token (case-insensitive) in a <mark> element styled with the
 * theme's primary accent colour.
 *
 * Usage:
 *   <HighlightText text={partner.name} query={search} />
 */
import React from "react";

interface HighlightTextProps {
  /** The full text to display */
  text: string;
  /** The active search query (may contain multiple space-separated tokens) */
  query?: string;
  /** Optional extra sx-compatible style for the mark element */
  markStyle?: React.CSSProperties;
}

export function HighlightText({ text, query, markStyle }: HighlightTextProps) {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }

  // Split query into unique, non-empty tokens
  const tokens = Array.from(
    new Set(query.trim().split(/\s+/).filter(Boolean))
  );

  if (tokens.length === 0) return <>{text}</>;

  // Build a single regex that matches any token (case-insensitive, global)
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              background: "rgba(99,102,241,0.18)", // indigo-500 @ 18% — matches primary
              color: "inherit",
              borderRadius: "2px",
              padding: "0 1px",
              fontWeight: 600,
              ...markStyle,
            }}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
