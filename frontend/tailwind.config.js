/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#12100E',
        panel: '#1C1815',
        panelLight: '#241F1A',
        amber: {
          DEFAULT: '#E8A33D',
          dim: '#B87F2E',
          glow: '#FFC978',
        },
        teal: {
          DEFAULT: '#2FE6C7',
          dim: '#1F9A85',
        },
        bone: '#F2ECD9',
        danger: '#D8452F',
      },
      fontFamily: {
        display: ['"Bungee"', 'cursive'],
        body: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'amber-gradient': 'linear-gradient(135deg, #E8A33D 0%, #B87F2E 100%)',
        'night-gradient': 'linear-gradient(180deg, #0B0A08 0%, #1C1815 100%)',
      },
      boxShadow: {
        amberGlow: '0 0 24px rgba(232, 163, 61, 0.35)',
        tealGlow: '0 0 24px rgba(47, 230, 199, 0.3)',
      },
    },
  },
  plugins: [],
};
