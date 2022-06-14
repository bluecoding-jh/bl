const {
  merge
} = require('webpack-merge');
const common = require('./webpack.common');
const path = require('path')
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  output: {
    clean: true,
    filename: '[name].min.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'BL',
      type: 'umd',
    },
    // auxiliaryComment: 'test'
  },
  devtool: 'eval', //'cheap-module-source-map',
  // optimization: {
  //   minimize: true,
  //   minimizer: [
  //     new TerserPlugin(),
  //     new CssMinimizerPlugin(),
  //   ],
  // },
});