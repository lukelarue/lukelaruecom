import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7F5AF0',
          dark: '#2CB67D',
          light: '#F4F4F5',
        },
      },
    },
  },
  plugins: [],
};

export default config;
