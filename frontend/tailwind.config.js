/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inka: {
          yellow: "#FFD200",
          yellowHover: "#F0C400",
          blue: "#002D62",
          lightBlue: "#005BAA",
          green: "#00A859",
          darkGreen: "#008544",
          red: "#E31837",
          bgLight: "#F8FAFC"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
