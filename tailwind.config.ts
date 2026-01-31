import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'p5-red': '#D50000',
        'p5-black': '#000000',
        'p5-white': '#FFFFFF',
      },
      transform: {
        'skew-x-7': 'skewX(-7deg)',
        'skew-y-7': 'skewY(-7deg)',
      },
      transitionTimingFunction: {
        'inertia': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
