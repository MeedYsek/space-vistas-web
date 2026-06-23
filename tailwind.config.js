/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mirrors src/config/scene.ts PALETTE so DOM + WebGL stay in sync.
        void: '#05060A',
        indigo: { deep: '#1a1140' },
        nebula: { violet: '#3a1d6e', magenta: '#b5179e', teal: '#1f9c8f' },
        glow: { cyan: '#5ad7ff', magenta: '#ff5ad2', amber: '#ffb15a' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.35em',
        wide2: '0.18em',
      },
    },
  },
  plugins: [],
}
