import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14201e",
        teal: { 50: "#ecfdf9", 100: "#d1faef", 500: "#18a88f", 600: "#108b78", 700: "#0d7063" },
        coral: { 50: "#fff3ef", 400: "#ff846b", 500: "#f76f55" },
        warm: { 50: "#faf9f7", 100: "#f3f1ed", 400: "#a8a39b", 600: "#69655f" }
      },
      boxShadow: {
        card: "0 12px 40px rgba(20, 32, 30, 0.07)",
        float: "0 18px 55px rgba(16, 139, 120, 0.16)"
      },
      borderRadius: { "4xl": "2rem" },
      animation: { "pulse-soft": "pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite" }
    }
  },
  plugins: []
} satisfies Config;
