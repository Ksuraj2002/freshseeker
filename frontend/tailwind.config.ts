import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.12), 0 20px 80px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'radial-soft': 'radial-gradient(circle at top, rgba(99,102,241,0.45), transparent 38%), radial-gradient(circle at right, rgba(16,185,129,0.18), transparent 30%), linear-gradient(180deg, rgba(7,10,20,1), rgba(12,16,32,1))',
      },
    },
  },
  plugins: [],
};

export default config;
