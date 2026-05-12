import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./pages/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#16a34a', dark: '#15803d', light: '#22c55e' }
      }
    }
  },
  plugins: []
}
export default config
