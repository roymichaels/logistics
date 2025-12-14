import React from "react";
import { useTheme, ThemeVariant } from "../../../foundation/theme/ThemeProvider";

const themes: ThemeVariant[] = ['telegramx', 'twitter', 'royal', 'swiss'];

export const ThemePanel = () => {
  const { theme, setVariant, setMode } = useTheme();

  return (
    <div style={{ padding: 16, color: "#fff" }}>
      <h2>Theme Variants</h2>
      {themes.map(t => (
        <button
          key={t}
          onClick={() => setVariant(t)}
          style={{
            display: "block",
            padding: 12,
            marginTop: 8,
            borderRadius: 8,
            background: theme.variant === t ? "rgba(97,168,255,0.2)" : "rgba(255,255,255,0.1)",
            width: "100%",
            textAlign: "left",
            border: theme.variant === t ? "1px solid rgba(97,168,255,0.5)" : "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          {t}
        </button>
      ))}

      <h2 style={{ marginTop: 24 }}>Mode</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setMode('dark')}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            background: theme.mode === 'dark' ? "rgba(97,168,255,0.2)" : "rgba(255,255,255,0.1)",
            border: theme.mode === 'dark' ? "1px solid rgba(97,168,255,0.5)" : "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Dark
        </button>
        <button
          onClick={() => setMode('light')}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            background: theme.mode === 'light' ? "rgba(97,168,255,0.2)" : "rgba(255,255,255,0.1)",
            border: theme.mode === 'light' ? "1px solid rgba(97,168,255,0.5)" : "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Light
        </button>
      </div>
    </div>
  );
};
