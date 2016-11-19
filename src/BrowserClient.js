import MqttClient from 'mqtt/lib/client'
import processOptions from './processOptions'
import createWebSocketStream from './createWebSocketStream'

class BrowserClient extends MqttClient {
  constructor(options) {
    const {aws, mqtt} = processOptions(options)
    super(() => createWebSocketStream(window.WebSocket, aws), mqtt)
  }
}

module.exports = BrowserClient
