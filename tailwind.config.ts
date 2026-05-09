import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        // Terminal layout accent
        terminal: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
        // Editorial layout accent
        editorial: {
          600: "#b45309",
          700: "#92400e",
        },
        ink: "#0f172a",
        cream: "#faf8f3",
      },
      fontFeatureSettings: {
        tnum: '"tnum" 1',
      },
    },
  },
  plugins: [],
};

export default config;
