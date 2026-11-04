import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        white: "hsl(var(--paper))",
        ink: {
          50: "hsl(var(--ink-50))", 100: "hsl(var(--ink-100))", 200: "hsl(var(--ink-200))",
          300: "hsl(var(--ink-300))", 400: "hsl(var(--ink-400))", 500: "hsl(var(--ink-500))",
          600: "hsl(var(--ink-600))", 700: "hsl(var(--ink-700))", 800: "hsl(var(--ink-800))",
          900: "hsl(var(--ink-900))", 950: "hsl(var(--ink-950))"
        },
        leaf: {
          50: "hsl(var(--leaf-50))", 100: "hsl(var(--leaf-100))", 200: "hsl(var(--leaf-200))",
          300: "hsl(var(--leaf-300))", 400: "hsl(var(--leaf-400))", 500: "hsl(var(--leaf-500))",
          600: "hsl(var(--leaf-600))", 700: "hsl(var(--leaf-700))", 800: "hsl(var(--leaf-800))",
          900: "hsl(var(--leaf-900))", 950: "hsl(var(--leaf-950))"
        },
        danger: {
          50: "hsl(var(--danger-50))", 100: "hsl(var(--danger-100))", 200: "hsl(var(--danger-200))",
          400: "hsl(var(--danger-400))", 500: "hsl(var(--danger-500))", 600: "hsl(var(--danger-600))",
          800: "hsl(var(--danger-800))", 900: "hsl(var(--danger-900))"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        brand: "hsl(var(--primary))",
        splix: "hsl(var(--primary))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};
