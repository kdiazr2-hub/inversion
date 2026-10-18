/** Python Quest — night-forest arcade palette. Single dark theme by design (high-legibility spec). */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1120",
        night: "#0f1830",
        panel: "#141f3a",
        panel2: "#1b2a4d",
        line: "#2c3f6b",
        text: "#e9eef8",
        muted: "#a3b3d4",
        gold: "#f2c14e",
        goldDeep: "#c9921f",
        sky: "#5ad1e8",
        leaf: "#6fd672",
        ember: "#ff7a59",
        violet: "#a996ff",
        rose: "#ff9fc2",
      },
      fontFamily: {
        pixel: ['"Pixelify Sans"', '"Courier New"', "monospace"],
        body: ['"Atkinson Hyperlegible"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        px: "0 0 0 2px #0b1120, 0 0 0 4px #2c3f6b",
        pxgold: "0 0 0 2px #0b1120, 0 0 0 4px #f2c14e",
        lift: "0 4px 0 0 #0b1120",
      },
      keyframes: {
        bob: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "70%": { transform: "scale(1.08)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        rise: { "0%": { transform: "translateY(0)", opacity: "1" }, "100%": { transform: "translateY(-120px)", opacity: "0" } },
      },
      animation: { bob: "bob 1.6s steps(4) infinite", pop: "pop .45s ease-out both", rise: "rise 1.4s ease-out forwards" },
    },
  },
  plugins: [],
};
