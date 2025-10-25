
module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  content: [],
  theme: {
    extend: {
      fontFamily: {
        khmer: ["Noto", 'serif']
      },
      colors: {
        'guardian-green': '#00573f', // Adjust the shade if needed
        primary: '#34D399',
      },
    },
  },
  plugins: [
    require('tailwindcss-animated'),
    require('tw-elements/dist/plugin'),
  ],
}

