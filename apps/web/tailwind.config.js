/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Professional Color Palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb', // Professional Blue
          600: '#1d4ed8',
          700: '#1e40af', // Dark Blue for hovers
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Success Green
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Error Red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Warning Orange
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Enhanced Neutral Palette
        gray: {
          50: '#f9fafb', // Background
          100: '#f3f4f6',
          200: '#e5e7eb', // Borders
          300: '#d1d5db',
          400: '#9ca3af', // Text Tertiary
          500: '#6b7280', // Text Secondary
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827', // Text Primary
        },
        // Surface colors
        surface: {
          50: '#ffffff', // Surface white
          100: '#f9fafb', // Light background
          200: '#f3f4f6', // Subtle background
        }
      },
      fontSize: {
        // Typography System
        'xs': ['12px', { lineHeight: '16px', fontWeight: '500' }], // Caption
        'sm': ['13px', { lineHeight: '18px', fontWeight: '400' }], // Body Small
        'base': ['14px', { lineHeight: '20px', fontWeight: '400' }], // Body
        'lg': ['16px', { lineHeight: '24px', fontWeight: '400' }], // Body Large
        'xl': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '0.02em' }], // H3 - Card Titles
        '2xl': ['20px', { lineHeight: '28px', fontWeight: '600' }], // H2 - Section Headers
        '3xl': ['28px', { lineHeight: '32px', fontWeight: '700' }], // H1 - Page Title
        // Currency numbers
        'currency-sm': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        'currency-base': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'currency-lg': ['28px', { lineHeight: '32px', fontWeight: '700' }],
        'currency-xl': ['36px', { lineHeight: '40px', fontWeight: '700' }],
      },
      spacing: {
        // 8px base spacing scale
        '1.5': '6px',
        '2.5': '10px',
        '3.5': '14px',
        '4.5': '18px',
        '5.5': '22px',
        '6.5': '26px',
        '7.5': '30px',
        '18': '72px', // Header height
        '22': '88px',
        '26': '104px',
        '30': '120px',
        '34': '136px',
        '38': '152px',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        // Professional shadow system
        'card': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.1)',
        'header': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'sidebar': '2px 0 8px rgba(0, 0, 0, 0.04)',
        'bottom-nav': '0 -2px 8px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      fontFeatureSettings: {
        'numeric': '"tnum"', // Tabular numbers
      },
    },
  },
  plugins: [
    // Add plugin for tabular numbers
    function({ addUtilities }) {
      addUtilities({
        '.tabular-nums': {
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
        },
      })
    },
  ],
};
