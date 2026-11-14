/** @type {import('tailwindcss').Config} */ 
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        background: "var(--canvas)",
        foreground: "var(--ink)",
        border: "var(--line)",
      },
    },
  },
  plugins: [],
};
