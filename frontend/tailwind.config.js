/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        institutional: {
          dark: '#10233F',      // Bleu nuit
          primary: '#1D4ED8',   // Bleu institutionnel
          light: '#EAF2FF',     // Bleu clair
          surface: '#F4F6FA',   // Gris clair
          text: '#263449',      // Gris foncé pour les textes
          accent: '#0284C7',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(16, 35, 63, 0.06), 0 2px 6px -1px rgba(16, 35, 63, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(16, 35, 63, 0.1), 0 8px 10px -6px rgba(16, 35, 63, 0.06)',
        'dropdown': '0 12px 30px rgba(16, 35, 63, 0.15)',
      }
    },
  },
  plugins: [],
}
