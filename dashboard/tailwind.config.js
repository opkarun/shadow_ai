import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "main.tsx"),
    path.join(__dirname, "App.tsx"),
    path.join(__dirname, "components/**/*.{js,ts,jsx,tsx}"),
    path.join(__dirname, "pages/**/*.{js,ts,jsx,tsx}"),
    path.join(__dirname, "hooks/**/*.{js,ts,jsx,tsx}"),
    path.join(__dirname, "routing/**/*.{js,ts,jsx,tsx}"),
    path.join(__dirname, "services/**/*.{js,ts,jsx,tsx}"),
    "./dashboard/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
