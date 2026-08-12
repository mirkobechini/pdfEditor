/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#F97316", // orange-500, matches desktop
                secondary: "#0EA5E9", // sky-500
            },
        },
    },
    plugins: [],
};