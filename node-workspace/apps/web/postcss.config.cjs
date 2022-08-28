module.exports = {
  plugins: {
    'tailwindcss': {},
    'tailwindcss/nesting': {},
    'postcss-preset-env': { stage: 1, features: { 'nesting-rules': false }, },
  }
}