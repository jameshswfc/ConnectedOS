import type { Config } from "tailwindcss";
import { brandColors } from "./src/lib/brand";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/services/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: brandColors.primarySoft,
          100: "#E7DDF0",
          500: "#6B4A8E",
          600: "#563878",
          700: brandColors.primary,
          900: brandColors.primaryDark
        },
        gold: {
          50: "#FBF7E8",
          100: "#F3E7B9",
          500: brandColors.accentGold,
          700: "#A17E18"
        },
        hospitality: {
          background: brandColors.background,
          text: brandColors.text,
          orange: brandColors.accentOrange
        }
      }
    }
  },
  plugins: []
};

export default config;
