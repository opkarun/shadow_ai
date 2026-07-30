/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.tsx",
    "./App.tsx",
    "./components/**/*.tsx",
    "./pages/**/*.tsx",
    "./hooks/**/*.tsx",
    "./routing/**/*.tsx",
    "./services/**/*.tsx",
  ],
  safelist: [
    // Layout
    "bg-slate-950",
    "min-h-screen",
    "h-screen",
    "w-full",
    "fixed",
    "absolute",
    "relative",
    "inset-0",
    "z-10",
    "-z-10",
    "overflow-hidden",
    "pointer-events-none",
    // Display
    "flex",
    "flex-col",
    "flex-row",
    "gap-4",
    // Spacing
    "p-4",
    "px-4",
    "py-4",
    "pr-8",
    "pl-4",
    "pt-2",
    "pb-2",
    // Colors
    "bg-indigo-500",
    "bg-indigo-500/10",
    "bg-purple-500/10",
    "text-white",
    "text-slate-400",
    "bg-white/5",
    // Borders
    "border",
    "border-slate-700",
    "rounded",
    "rounded-full",
    // Effects
    "blur-3xl",
    "opacity-20",
    "delay-1000",
    "animate-pulse",
    // Positioning
    "top-0",
    "bottom-0",
    "left-1/4",
    "right-1/4",
    // Sizing
    "w-96",
    "h-96",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
