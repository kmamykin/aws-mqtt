import Client from './Client'
import createWebSocketStream from './createWebSocketStream'
import publisher from './publisher'
const connect = (options) => new Client(options)

module.exports = {
  Client,
  connect,
  publisher,
  createWebSocketStream
}
