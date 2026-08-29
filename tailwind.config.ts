import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#041416",
          900: "#072023",
          850: "#0A2D31",
          800: "#0D3B3F", // Brand Primary
          700: "#13545A",
          600: "#1B747C",
          500: "#2798A2",
          400: "#3EC1CD",
          300: "#70D5DE",
          200: "#AEE5EA",
          100: "#D3EFF2",
          50: "#EDF8F9",
        },
        sage: {
          900: "#1E3B33",
          800: "#2B5247",
          700: "#3A6C5E",
          600: "#4E8777", // Brand Secondary Accent
          500: "#65A392",
          400: "#86BFB0",
          300: "#A7D4C8",
          200: "#C9E4DC",
          100: "#E6F3EF",
          50: "#F2F9F6",
        },
        terracotta: {
          900: "#5E2514",
          800: "#85351D",
          700: "#B04928",
          600: "#D97757", // Warm CTA Accent
          500: "#E38F74",
          400: "#EFA993",
          300: "#F5C2B1",
          200: "#F9D9CE",
          100: "#FCEEE9",
          50: "#FEF7F5",
        },
        alabaster: {
          base: "#F9F9F7", // Warm background
          card: "#FFFFFF",
          muted: "#F1F2ED",
          border: "#E4E7E5",
        },
        crisis: {
          DEFAULT: "#DC2626",
          dark: "#991B1B",
          light: "#FEE2E2",
        },
      },
      fontFamily: {
        cairo: ["Cairo", "Tajawal", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
