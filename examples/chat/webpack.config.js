const path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.join(__dirname, './dist'),
    filename: 'bundle.js'
  },
  devtool: 'eval',
  node: {
    fs: "empty"
  },
  resolve: {
    root: [
      path.resolve('./node_modules'),
      path.resolve('../../node_modules')
    ]
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        // exclude: /node_modules/,
        include: [
          path.resolve(__dirname, 'src')
        ],
        loader: 'babel',
        query: {
          presets: ['es2015', 'stage-2']
        }
      }, {
        test: /\.json$/,
        include: /aws-sdk/,
        loader: 'json'
      }
    ]
  }
}
