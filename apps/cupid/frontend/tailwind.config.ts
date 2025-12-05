import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Lexend", "sans-serif"],
        display: ['"Lexend Giga"', "sans-serif"],
        emphasis: ['"Lexend Peta"', "sans-serif"],
        body: ["Lexend", "sans-serif"],
      },
      colors: {
        surface: {
          light: "#f8f6f1",
          dark: "#0b1120",
        },
      },
    },
  },
  plugins: [],
};

export default config;
