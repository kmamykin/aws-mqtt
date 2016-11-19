import MqttClient from 'mqtt/lib/client'
import processOptions from './processOptions'
import createWebSocketStream from './createWebSocketStream'

class Client extends MqttClient {
  constructor(options) {
    const {WebSocket, aws, mqtt} = processOptions(options)
    super(() => createWebSocketStream(WebSocket, aws), mqtt)
  }
}

module.exports = Client
