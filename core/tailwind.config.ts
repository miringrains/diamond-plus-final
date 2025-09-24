import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/design/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Design system colors
        "dd-bg": "var(--dd-bg)",
        "dd-chrome": "var(--dd-chrome)",
        "dd-fg": "var(--dd-fg)",
        "dd-fg-muted": "var(--dd-fg-muted)",
        "dd-border": "var(--dd-border)",
        "dd-accent": "var(--dd-accent)",
        "dd-accent-600": "var(--dd-accent-600)",
        "dd-accent-700": "var(--dd-accent-700)",
        "dd-ring": "var(--dd-ring)",
        "dd-fg-on-chrome": "var(--dd-fg-on-chrome)",
        "dd-fg-muted-on-chrome": "var(--dd-fg-muted-on-chrome)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
