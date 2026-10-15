/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inkafarma: {
          green: "#00A650",
          greenHover: "#008E44",
          greenDark: "#006F35",
          greenLight: "#E8F8F0",
          greenBg: "#F2FBF6",
          red: "#E30613",
          redHover: "#C50510",
          yellow: "#FFD200",
          yellowHover: "#E6BC00",
          dark: "#1A2E22",
          slate: "#4A5568",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
