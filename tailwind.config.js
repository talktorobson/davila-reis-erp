/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1a1a2e',
        'primary-blue': '#16213e', 
        'accent-gold': '#aa8019',
        'accent-gold-light': '#d4a62a',
        'text-light': '#ecf0f1',
        'text-dark': '#2c3e50',
        'bg-light': '#f8f9fa',
      },
      backgroundImage: {
        'gradient-law': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        'gradient-gold': 'linear-gradient(135deg, #aa8019 0%, #d4a62a 100%)',
      },
      boxShadow: {
        'law': '0 10px 30px rgba(26, 26, 46, 0.15)',
        'gold': '0 5px 20px rgba(170, 128, 25, 0.3)',
      },
    },
  },
  plugins: [],
};