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
    extend: {},
  },
  plugins: [],
}
