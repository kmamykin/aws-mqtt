import MqttClient from 'mqtt/lib/client'
import processOptions from './processOptions'
import createWebSocketStream from './createWebSocketStream'
import WebSocket from 'ws' // Use node.js implementation of WebSocket

class ServerClient extends MqttClient {
  constructor(options) {
    const {aws, mqtt} = processOptions(options)
    super(() => createWebSocketStream(WebSocket, aws), mqtt)
  }
}

module.exports = ServerClient
