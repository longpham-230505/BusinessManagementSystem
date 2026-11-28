import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2B2A27",
        paper: "#FAFAF8",
        line: "#E4E1DA",
        accent: "#2B5F52",
        side: "#1F3F36",
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["var(--font-logo)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
