/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",
                primary: {
                    DEFAULT: "rgb(var(--primary) / <alpha-value>)",
                    foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
                    foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "rgb(var(--accent) / <alpha-value>)",
                    foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
                },
                card: {
                    DEFAULT: "rgb(var(--card) / <alpha-value>)",
                    foreground: "rgb(var(--card-foreground) / <alpha-value>)",
                },
                success: "rgb(var(--success) / <alpha-value>)",
                warning: "rgb(var(--warning) / <alpha-value>)",
                error: "rgb(var(--error) / <alpha-value>)",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
                'slide-in': 'slide-in-right 0.2s ease-out',
                'shimmer': 'shimmer 1.5s infinite',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'slide-in-right': {
                    '0%': { opacity: '0', transform: 'translateX(-10px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
