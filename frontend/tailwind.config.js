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
          green: "#008446",
          greenHover: "#006F3B",
          greenDark: "#005E32",
          greenLight: "#E7F6EE",
          greenBg: "#F3FAF6",
          red: "#E30613",
          redHover: "#C50510",
          yellow: "#FFD200",
          yellowHover: "#F0C400",
          dark: "#14291E",
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
