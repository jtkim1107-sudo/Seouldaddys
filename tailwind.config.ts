import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 그린 (로고 딥그린 #1e4b2c 기반)
        brand: {
          50: "#eff6f0",
          100: "#dcebdf",
          200: "#bfdcc6",
          300: "#8fbf9c",
          400: "#579a6b",
          500: "#2f6f45",
          600: "#265c39",
          700: "#1e4b2c",
          800: "#173a22",
          900: "#112c1a",
        },
        // 카멜 브라운 (로고 포인트 컬러)
        camel: {
          50: "#f9f3ea",
          100: "#f0e2cc",
          500: "#a97b45",
          600: "#8f6537",
          700: "#75512c",
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
