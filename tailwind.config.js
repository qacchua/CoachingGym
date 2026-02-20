/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // This safelist has been updated to match the new color palette
  safelist: [
    'border-emerald-500', 'bg-emerald-50', 'text-emerald-800',
    'border-lime-500', 'bg-lime-50', 'text-lime-800',
    'border-amber-500', 'bg-amber-50', 'text-amber-800',
    'border-rose-500', 'bg-rose-50', 'text-rose-800',
    'border-slate-500', 'bg-slate-50', 'text-slate-800',
  ],
  theme: {
    extend: {// --- ADD THIS SECTION ---
      animation: {
        blob: "blob 7s infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      // ------------------------
    },
  },
  plugins: [],
}