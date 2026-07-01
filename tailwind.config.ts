import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".75rem",
        md: ".5rem",
        sm: ".25rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      colors: {
        /* ── Shadcn semantic tokens ───────────────────────────── */
        background: "hsl(var(--background) / <alpha-value>)",
        foreground:  "hsl(var(--foreground)  / <alpha-value>)",
        border:      "hsl(var(--border)      / <alpha-value>)",
        input:       "hsl(var(--input)       / <alpha-value>)",
        ring:        "hsl(var(--ring)        / <alpha-value>)",
        card: {
          DEFAULT:    "hsl(var(--card)                / <alpha-value>)",
          foreground: "hsl(var(--card-foreground)     / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover)              / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground)   / <alpha-value>)",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary)              / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground)   / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary)            / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted)                / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground)     / <alpha-value>)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent)               / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground)    / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive)           / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground)/ <alpha-value>)",
        },

        /* ── adavi.ai brand palette ──────────────────────────── */
        ds: {
          bg:           "#0D1929",
          card:         "#16233B",
          card2:        "#1a2f4e",
          deep:         "#0a1420",
          gold:         "#C5A35A",
          "gold-hover": "#d4b06a",
          "gold-light": "#e0c37a",
          silver:       "rgba(255,255,255,0.80)",
          muted:        "rgba(255,255,255,0.55)",
          dim:          "rgba(255,255,255,0.35)",
          ghost:        "rgba(255,255,255,0.06)",
          green:        "#4ADE80",
          blue:         "#60A5FA",
          red:          "#f87171",
        },

        /* ── Chart ───────────────────────────────────────────── */
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring:       "hsl(var(--sidebar-ring)       / <alpha-value>)",
          DEFAULT:    "hsl(var(--sidebar)             / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground)  / <alpha-value>)",
          border:     "hsl(var(--sidebar-border)      / <alpha-value>)",
        },
      },
      fontFamily: {
        sans:    ["Calibri", "Arial", "sans-serif"],
        display: ["Calibri", "Arial", "sans-serif"],
        serif:   ["Calibri", "Arial", "sans-serif"],
        mono:    ["var(--font-mono)"],
      },
      boxShadow: {
        "gold-sm": "0 0 12px rgba(197,163,90,0.12)",
        "gold":    "0 0 24px rgba(197,163,90,0.18), 0 4px 16px rgba(0,0,0,0.25)",
        "gold-lg": "0 0 40px rgba(197,163,90,0.2),  0 8px 32px rgba(0,0,0,0.35)",
        "card":    "0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)",
        "nav":     "0 1px 0 rgba(197,163,90,0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "shimmer":        "shimmer 2.5s linear infinite",
        "fade-in":        "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
