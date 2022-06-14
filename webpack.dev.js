const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const {
  merge
} = require('webpack-merge');
const common = require('./webpack.common');
const {
  webpack
} = require('webpack');

module.exports = merge(common, {
  mode: 'development',
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist'), //'C:/Users/Administrator/git/cdsm-web/src/main/webapp/js/request/bundle',
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  devtool: 'source-map',
  plugins: [
    new HtmlWebPackPlugin({
      template: './index.html',
    })
  ],
  devServer: {
    publicPath: '/',
    contentBase: path.join(__dirname, 'dist'),
    // inline: true,
    // compress: true,
    port: 1004,
    // hot: true,
    // liveReload: true,
    // overlay: true,
    // stats: 'errors-only',
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:83',
    //     pathRewrite: {
    //       '^/api': ''
    //     },
    //     secure: false,
    //     changeOrigin: true,
    //   },
    // },
  },
});