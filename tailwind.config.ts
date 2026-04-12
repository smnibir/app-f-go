import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1e3a5f",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#3b82f6",
        },
        surface: "#f8f9fa",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      minHeight: {
        touch: "48px",
        input: "52px",
      },
    },
  },
  plugins: [],
};
export default config;
