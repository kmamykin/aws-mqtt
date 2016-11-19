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
        loader: 'json'
      }
    ]
  }
}
