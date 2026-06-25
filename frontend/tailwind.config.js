/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        yellow: { DEFAULT: 'var(--yellow)', deep: 'var(--yellow-deep)' },
        blue: { DEFAULT: 'var(--blue)', deep: 'var(--blue-deep)' },
        pink: { DEFAULT: 'var(--pink)', deep: 'var(--pink-deep)' },
        green: { DEFAULT: 'var(--green)', deep: 'var(--green-deep)' },
        orange: 'var(--orange)',
        purple: 'var(--purple)',
        cream: 'var(--cream)',
        paper: 'var(--paper)',
        ink: { DEFAULT: 'var(--ink)', light: 'var(--ink-light)' }
      },
      fontFamily: {
        shrikhand: ['var(--font-shrikhand)', 'cursive'],
        zilla: ['var(--font-zilla-slab)', 'serif'],
        caveat: ['var(--font-caveat)', 'cursive']
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
}