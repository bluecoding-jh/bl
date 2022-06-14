const MiniCssExtractionPlugin = require('mini-css-extract-plugin');
module.exports = {
  entry: {
    bl: ['@babel/polyfill', './index.js'],
  },
  module: {
    rules: [{
      test: /\.js?$/,
      loader: 'babel-loader',
    }, {
      test: /\.css$/,
      use: [
        MiniCssExtractionPlugin.loader,
        'css-loader'
      ]
    }]
  },
  plugins: [
    new MiniCssExtractionPlugin({
      filename: '[name].min.css',
    })
  ],
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.json', '.ts']
  },
  target: ['web', 'es5'],
}