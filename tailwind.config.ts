import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--brand-rgb) / 1)",
        },
        brandBg: "var(--brandBg)",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
