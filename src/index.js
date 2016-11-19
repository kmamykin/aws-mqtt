import Client from './Client'
import createWebSocketStream from './createWebSocketStream'

const connect = (options) => new Client(options)

module.exports = {
  Client,
  connect,
  createWebSocketStream
}
