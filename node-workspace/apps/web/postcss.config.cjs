const isDev = /^dev\w*$/i.test(process.env.NODE_ENV)

module.exports = {
  plugins: {
    'tailwindcss': {},
    'tailwindcss/nesting': {},
    'postcss-preset-env': { stage: 1, features: { 'nesting-rules': false }, },
    ...(isDev && { cssnano: {} })
  }
}