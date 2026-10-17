/** @type {import('tailwindcss').Config} */
// Brand colors resolve through CSS variables so the admin panel re-themes
// instantly when [data-theme] changes on <html>. The storefront uses the
// fixed `sk` (ShopKart) palette below, matching the approved design system.
const brand = (shade) => `rgb(var(--brand-${shade}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: brand(50),
          100: brand(100),
          200: brand(200),
          300: brand(300),
          400: brand(400),
          500: brand(500),
          600: brand(600),
          700: brand(700),
          800: brand(800),
          900: brand(900),
          950: brand(950),
        },
        // Fixed ShopKart storefront palette (approved design)
        sk: {
          primary: '#0056c3',
          'primary-deep': '#004299',
          'primary-bright': '#1f6feb',
          ink: '#0b1c30',
          bg: '#f8f9ff',
          mist: '#eff4ff',
          'mist-2': '#e5eeff',
          'mist-3': '#d3e4fe',
          amber: '#9e6a00',
          'amber-soft': '#ffddb1',
          'amber-text': '#7e5300',
          danger: '#ba1a1a',
          'danger-soft': '#ffdad6',
          muted: '#505f7a',
          outline: '#727786',
          green: '#1f9d55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,28,48,0.06)',
        lift: '0 12px 32px -8px rgba(11,28,48,0.18)',
      },
    },
  },
  plugins: [],
};
