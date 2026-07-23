import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#1A1A1A',
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#4a4a4a',
          700: '#333333',
          800: '#242424',
          900: '#1A1A1A',
        },
        sunset: {
          DEFAULT: '#E07856',
          50: '#fdf3ef',
          100: '#fbe4d9',
          200: '#f5c4ac',
          300: '#eea079',
          400: '#e88767',
          500: '#E07856',
          600: '#c95d3d',
          700: '#a54930',
          800: '#7f3a27',
          900: '#5c2b1c',
        },
        deepsea: {
          DEFAULT: '#1F3A4D',
          50: '#eff4f8',
          100: '#d5e0ea',
          200: '#a8bfd0',
          300: '#7495ae',
          400: '#446f8f',
          500: '#2a5375',
          600: '#1F3A4D',
          700: '#182d3d',
          800: '#12212d',
          900: '#0a151d',
        },
        sand: {
          DEFAULT: '#F5EDE3',
          50: '#fbf8f4',
          100: '#F5EDE3',
          200: '#ebdac6',
          300: '#dcc09e',
          400: '#c9a274',
          500: '#b58656',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.03), 0 4px 12px -2px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 8px 0 rgb(0 0 0 / 0.04), 0 12px 24px -4px rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
