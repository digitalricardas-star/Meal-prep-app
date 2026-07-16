/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          100: "#dcf0e4",
          500: "#2f9e5f",
          600: "#238050",
          700: "#1d6742",
        },
      },
    },
  },
  plugins: [],
};
