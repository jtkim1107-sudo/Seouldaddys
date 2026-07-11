import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4ec",
          100: "#ffe6d5",
          200: "#ffd0b0",
          300: "#ffab78",
          400: "#fb8a42",
          500: "#f4691f",
          600: "#e05a12",
          700: "#b8490f",
          800: "#933b10",
          900: "#772f10",
        },
        ink: {
          900: "#1c1917",
          950: "#151210",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)",
        lift: "0 2px 4px rgba(28,25,23,0.05), 0 12px 32px rgba(28,25,23,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
