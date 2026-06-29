/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./global.css",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        base: "#0F0E23",
        surface: "#1A1930",
        "surface-2": "#2A2940",
        "surface-3": "#3D3B5C",
        border: "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.12)",
        primary: "#7B61FF",
        "primary-dark": "#5B41DF",
        teal: "#1DB98A",
        amber: "#F0A500",
        danger: "#E24B4A",
        "text-primary": "#F0EFF8",
        "text-secondary": "#B8B6D4",
        "text-muted": "#8E8CAE",
      },
      fontFamily: {
        mono: ["Menlo", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
