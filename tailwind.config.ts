import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#4A2C35",
        blush: "#FFD9E8",
        rosegold: "#E85588",
        cream: "#FFF5F7",
        wine: "#E91E63",
        wineDark: "#C2185B"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(36, 27, 27, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
