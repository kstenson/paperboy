import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'google-reader': {
          primary: '#dd4b39',
          sidebar: {
            DEFAULT: '#f5f5f5',
            dark: '#1f2937'
          },
          text: {
            DEFAULT: '#222',
            dark: '#e5e7eb'
          },
          border: {
            DEFAULT: '#ddd',
            dark: '#374151'
          },
          bg: {
            DEFAULT: '#ffffff',
            dark: '#111827'
          }
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config