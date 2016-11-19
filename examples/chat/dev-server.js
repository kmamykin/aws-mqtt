var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('./webpack.config');

new WebpackDevServer(webpack(config), {
  // publicPath: config.output.publicPath,
  contentBase: "./src",
  // hot: true,
  // historyApiFallback: true,
  quiet: false,
  noInfo: false,
  headers: {
    "Access-Control-Allow-Origin": "*"
  }
}).listen(3333, 'localhost', function (err, result) {
  if (err) {
    return console.log(err);
  }

  console.log('Running on http://localhost:3333/');
});
